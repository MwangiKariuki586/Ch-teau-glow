import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateBookingPolicy } from "@/lib/bookings/policy-engine";
import {
  getAnyBookingChangeRequest,
  getBookingActorContext,
  getBookingById,
  getBookingRescheduleCount,
  logBookingAction,
} from "@/lib/bookings/policy-server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const querySchema = z.object({
  action: z.enum(["cancel", "reschedule", "all"]),
  log: z.enum(["true", "false"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid booking id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid action query.", issues: parsedQuery.error.issues },
      { status: 400 },
    );
  }

  const actorContext = await getBookingActorContext();
  if (!actorContext.ok) {
    return NextResponse.json({ error: actorContext.error }, { status: actorContext.status });
  }

  const { userId, actorRole, serviceSupabase } = actorContext.data;
  const bookingId = parsedParams.data.id;

  const bookingResult = await getBookingById(serviceSupabase, bookingId);
  if (bookingResult.error) {
    return NextResponse.json({ error: bookingResult.error }, { status: 500 });
  }

  if (!bookingResult.booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const booking = bookingResult.booking;

  const shouldLog = parsedQuery.data.log === "true";
  const requestedAction = parsedQuery.data.action;

  let rescheduleCount = 0;
  let existingChangeRequest: { id: string; status: string } | null = null;
  if (requestedAction === "reschedule" || requestedAction === "all") {
    const rescheduleCountResult = await getBookingRescheduleCount(serviceSupabase, booking.id);
    if (rescheduleCountResult.error) {
      return NextResponse.json({ error: rescheduleCountResult.error }, { status: 500 });
    }
    rescheduleCount = rescheduleCountResult.count;

    const changeRequestResult = await getAnyBookingChangeRequest(serviceSupabase, booking.id);
    if (changeRequestResult.error) {
      return NextResponse.json({ error: changeRequestResult.error }, { status: 500 });
    }
    existingChangeRequest = changeRequestResult.request;
  }

  const baseBooking = {
    id: booking.id,
    user_id: booking.user_id,
    status: booking.status,
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    reschedule_count: rescheduleCount,
  };

  const evaluateAndMaybeLog = async (
    actionType: "preview_cancel" | "preview_reschedule",
  ) => {
    if (
      actionType === "preview_reschedule" &&
      actorRole === "customer" &&
      existingChangeRequest
    ) {
      const deniedResult = {
        allowed: false,
        reason:
          "This booking already has a reschedule request history and cannot be rescheduled again.",
        decision_reason:
          "This booking already has a reschedule request history and cannot be rescheduled again.",
        flags: {},
        window: undefined,
        policySnapshot: {
          policy_pack: "v1",
          action: actionType,
          booking_change_request_id: existingChangeRequest.id,
          booking_change_request_status: existingChangeRequest.status,
        },
      };

      if (shouldLog) {
        try {
          await logBookingAction({
            serviceSupabase,
            bookingId: booking.id,
            actionType,
            actorUserId: userId,
            actorRole,
            decision: "denied",
            decisionReason: deniedResult.reason,
            policySnapshot: deniedResult.policySnapshot,
            metadata: {
              preview: true,
              booking_change_request_id: existingChangeRequest.id,
              booking_change_request_status: existingChangeRequest.status,
            },
          });
        } catch (error) {
          console.error("Failed to log booking preview action:", error);
        }
      }

      return deniedResult;
    }

    const evaluation = evaluateBookingPolicy({
      action: actionType,
      actorRole,
      actorUserId: userId,
      booking: baseBooking,
      now: new Date(),
    });

    if (shouldLog) {
      try {
        await logBookingAction({
          serviceSupabase,
          bookingId: booking.id,
          actionType,
          actorUserId: userId,
          actorRole,
          decision: evaluation.allowed ? "approved" : "denied",
          decisionReason: evaluation.reason,
          policySnapshot: evaluation.policySnapshot,
          metadata: {
            preview: true,
          },
        });
      } catch (error) {
        console.error("Failed to log booking preview action:", error);
      }
    }

    return {
      allowed: evaluation.allowed,
      reason: evaluation.reason,
      decision_reason: evaluation.reason,
      flags: evaluation.flags,
      window: evaluation.window,
      policySnapshot: evaluation.policySnapshot,
    };
  };

  if (requestedAction === "all") {
    const [cancel, reschedule] = await Promise.all([
      evaluateAndMaybeLog("preview_cancel"),
      evaluateAndMaybeLog("preview_reschedule"),
    ]);

    return NextResponse.json({
      cancel,
      reschedule,
    });
  }

  const actionType = requestedAction === "cancel" ? "preview_cancel" : "preview_reschedule";
  const result = await evaluateAndMaybeLog(actionType);
  return NextResponse.json(result);
}
