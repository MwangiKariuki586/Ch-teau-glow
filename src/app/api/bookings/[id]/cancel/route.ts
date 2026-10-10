import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { z } from "zod";
import { evaluateBookingPolicy } from "@/lib/bookings/policy-engine";
import {
  appendReasonToNotes,
  getBookingActorContext,
  getBookingById,
  getBookingSummaryById,
  logBookingAction,
} from "@/lib/bookings/policy-server";
import { notifyAdminsForBookingEvent } from "@/lib/notifications/admin";
import { buildAdminBookingNotificationLink } from "@/lib/notifications/server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid booking id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    rawBody = {};
  }

  const parsedBody = cancelSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const actorContext = await getBookingActorContext();
  if (!actorContext.ok) {
    return NextResponse.json({ error: actorContext.error }, { status: actorContext.status });
  }

  const { userId, actorRole, serviceSupabase } = actorContext.data;
  const bookingId = parsedParams.data.id;
  const reason = parsedBody.data.reason?.trim();

  const bookingResult = await getBookingById(serviceSupabase, bookingId);
  if (bookingResult.error) {
    return NextResponse.json({ error: bookingResult.error }, { status: 500 });
  }

  if (!bookingResult.booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const booking = bookingResult.booking;
  const adminLinkUrl = buildAdminBookingNotificationLink(booking.id);
  const scheduledLabel = format(new Date(booking.starts_at), "MMM d, yyyy h:mm a");

  const evaluation = evaluateBookingPolicy({
    action: "cancel",
    actorRole,
    actorUserId: userId,
    booking: {
      id: booking.id,
      user_id: booking.user_id,
      status: booking.status,
      starts_at: booking.starts_at,
      ends_at: booking.ends_at,
    },
    now: new Date(),
  });

  if (evaluation.flags.requires_override_reason && !reason) {
    evaluation.allowed = false;
    evaluation.reason = "An override reason is required for this cancellation.";
  }

  if (!evaluation.allowed) {
    try {
      await logBookingAction({
        serviceSupabase,
        bookingId: booking.id,
        actionType: "cancel",
        actorUserId: userId,
        actorRole,
        decision: "denied",
        decisionReason: evaluation.reason,
        policySnapshot: evaluation.policySnapshot,
        metadata: {
          reason: reason ?? null,
        },
      });
    } catch (error) {
      console.error("Failed to log denied cancellation:", error);
    }

    return NextResponse.json(
      {
        error: evaluation.reason,
        decision_reason: evaluation.reason,
        flags: evaluation.flags,
      },
      { status: 403 },
    );
  }

  const mergedNotes = appendReasonToNotes({
    existingNotes: booking.notes,
    label: actorRole === "admin" ? "Admin cancellation reason" : "Cancellation reason",
    reason,
  });

  const { error: updateError } = await serviceSupabase
    .from("bookings")
    .update({
      status: "cancelled",
      notes: mergedNotes,
    })
    .eq("id", booking.id);

  if (updateError) {
    console.error("Failed to cancel booking:", updateError);
    return NextResponse.json(
      { error: "We couldn't cancel this booking right now. Please try again." },
      { status: 500 },
    );
  }

  const summaryResult = await getBookingSummaryById(serviceSupabase, booking.id);
  if (summaryResult.error || !summaryResult.booking) {
    return NextResponse.json(
      { error: summaryResult.error ?? "Failed to load updated booking." },
      { status: 500 },
    );
  }

  try {
    await logBookingAction({
      serviceSupabase,
      bookingId: booking.id,
      actionType: "cancel",
      actorUserId: userId,
      actorRole,
      decision: "approved",
      decisionReason: evaluation.reason,
      policySnapshot: evaluation.policySnapshot,
      metadata: {
        reason: reason ?? null,
        late_cancel: evaluation.flags.late_cancel ?? false,
      },
    });
  } catch (error) {
    console.error("Failed to log cancellation:", error);
  }

  await notifyAdminsForBookingEvent({
    supabase: serviceSupabase,
    eventType: actorRole === "admin" ? "booking_cancelled_by_admin" : "booking_cancelled_by_customer",
    bookingId: booking.id,
    actorUserId: actorRole === "admin" ? userId : null,
    title: actorRole === "admin" ? "Booking cancelled by admin" : "Booking cancelled by customer",
    body:
      actorRole === "admin"
        ? `Booking scheduled for ${scheduledLabel} was cancelled by an admin${reason ? `. Reason: ${reason}` : ""}.`
        : `Booking scheduled for ${scheduledLabel} was cancelled by the customer${reason ? `. Reason: ${reason}` : ""}.`,
    linkUrl: adminLinkUrl,
    dedupeKey: `admin:${actorRole === "admin" ? "booking_cancelled_by_admin" : "booking_cancelled_by_customer"}:${booking.id}`,
    meta: {
      booking_id: booking.id,
      scheduled_at_label: scheduledLabel,
      reason: reason ?? null,
      actor_role: actorRole,
    },
  });

  revalidatePath("/customer/bookings");
  revalidatePath(`/customer/bookings/${booking.id}`);

  return NextResponse.json({
    data: {
      booking: summaryResult.booking,
    },
  });
}
