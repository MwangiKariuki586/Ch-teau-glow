import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { addMinutes, format, parseISO, subMinutes } from "date-fns";
import { z } from "zod";
import { SESSION_BUFFER_MINUTES } from "@/lib/bookings/availability-config";
import { evaluateBookingPolicy } from "@/lib/bookings/policy-engine";
import {
  getBookingActorContext,
  getBookingById,
  getBookingRescheduleCount,
  getBookingSummaryById,
  logBookingAction,
} from "@/lib/bookings/policy-server";
import { notifyAdminsForBookingEvent } from "@/lib/notifications/admin";
import { buildAdminBookingNotificationLink } from "@/lib/notifications/server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const rescheduleSchema = z.object({
  new_starts_at: z.string().datetime({ offset: true }),
  new_ends_at: z.string().datetime({ offset: true }),
  reason: z.string().trim().max(500).optional(),
});

const conflictStatuses = ["pending", "confirmed", "rescheduled"];

function internalRescheduleError() {
  return NextResponse.json(
    { error: "We couldn't reschedule this booking right now. Please try again." },
    { status: 500 },
  );
}

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

  const parsedBody = rescheduleSchema.safeParse(rawBody);
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
    console.error("Failed to load booking for reschedule:", bookingResult.error);
    return internalRescheduleError();
  }

  if (!bookingResult.booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const booking = bookingResult.booking;
  const adminLinkUrl = buildAdminBookingNotificationLink(booking.id);

  const { data: existingRequest, error: existingRequestError } = await serviceSupabase
    .from("booking_change_requests")
    .select("id")
    .eq("booking_id", booking.id)
    .limit(1)
    .maybeSingle();

  if (existingRequestError) {
    console.error("Failed to check booking change requests:", existingRequestError);
    return internalRescheduleError();
  }

  if (existingRequest) {
    return NextResponse.json(
      {
        error: "This booking already has a reschedule request history and cannot be rescheduled again.",
      },
      { status: 409 },
    );
  }

  const rescheduleCountResult = await getBookingRescheduleCount(serviceSupabase, booking.id);
  if (rescheduleCountResult.error) {
    console.error(
      "Failed to load booking reschedule count:",
      rescheduleCountResult.error,
    );
    return internalRescheduleError();
  }

  const evaluation = evaluateBookingPolicy({
    action: "reschedule",
    actorRole,
    actorUserId: userId,
    booking: {
      id: booking.id,
      user_id: booking.user_id,
      status: booking.status,
      starts_at: booking.starts_at,
      ends_at: booking.ends_at,
      reschedule_count: rescheduleCountResult.count,
    },
    now: new Date(),
    requestedChange: {
      new_starts_at: parsedBody.data.new_starts_at,
      new_ends_at: parsedBody.data.new_ends_at,
    },
  });

  if (evaluation.flags.requires_override_reason && !reason) {
    evaluation.allowed = false;
    evaluation.reason = "An override reason is required for this reschedule.";
  }

  if (!evaluation.allowed) {
    try {
      await logBookingAction({
        serviceSupabase,
        bookingId: booking.id,
        actionType: "reschedule",
        actorUserId: userId,
        actorRole,
        decision: "denied",
        decisionReason: evaluation.reason,
        policySnapshot: evaluation.policySnapshot,
        metadata: {
          requested_change: {
            new_starts_at: parsedBody.data.new_starts_at,
            new_ends_at: parsedBody.data.new_ends_at,
          },
          reason: reason ?? null,
        },
      });
    } catch (error) {
      console.error("Failed to log denied reschedule:", error);
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

  const nextStartsAt = evaluation.effects.next_starts_at ?? parsedBody.data.new_starts_at;
  const nextEndsAt = evaluation.effects.next_ends_at ?? parsedBody.data.new_ends_at;
  const bufferedNextStartsAt = subMinutes(
    parseISO(nextStartsAt),
    SESSION_BUFFER_MINUTES,
  ).toISOString();
  const bufferedNextEndsAt = addMinutes(
    parseISO(nextEndsAt),
    SESSION_BUFFER_MINUTES,
  ).toISOString();

  const { data: conflictingBooking, error: conflictError } = await serviceSupabase
    .from("bookings")
    .select("id,starts_at,ends_at")
    .eq("specialist_id", booking.specialist_id)
    .neq("id", booking.id)
    .in("status", conflictStatuses)
    .lt("starts_at", bufferedNextEndsAt)
    .gt("ends_at", bufferedNextStartsAt)
    .limit(1)
    .maybeSingle();

  if (conflictError) {
    console.error("Failed to check reschedule conflicts:", conflictError);
    return internalRescheduleError();
  }

  if (conflictingBooking) {
    const conflictReason = `Selected slot conflicts with an existing specialist booking or the required ${SESSION_BUFFER_MINUTES}-minute buffer.`;

    try {
      await logBookingAction({
        serviceSupabase,
        bookingId: booking.id,
        actionType: "reschedule",
        actorUserId: userId,
        actorRole,
        decision: "denied",
        decisionReason: conflictReason,
        policySnapshot: evaluation.policySnapshot,
        metadata: {
          reason: reason ?? null,
          conflict_booking_id: conflictingBooking.id,
          requested_change: {
            new_starts_at: nextStartsAt,
            new_ends_at: nextEndsAt,
          },
        },
      });
    } catch (error) {
      console.error("Failed to log conflicting reschedule:", error);
    }

    return NextResponse.json(
      {
        error: conflictReason,
        decision_reason: conflictReason,
      },
      { status: 409 },
    );
  }

  const { error: updateError } = await serviceSupabase
    .from("bookings")
    .update({
      starts_at: nextStartsAt,
      ends_at: nextEndsAt,
    })
    .eq("id", booking.id);

  if (updateError) {
    if (updateError.code === "23505") {
      const conflictReason = `Selected slot conflicts with an existing specialist booking or the required ${SESSION_BUFFER_MINUTES}-minute buffer.`;
      return NextResponse.json(
        {
          error: conflictReason,
          decision_reason: conflictReason,
        },
        { status: 409 },
      );
    }

    console.error("Failed to update booking during reschedule:", updateError);
    return internalRescheduleError();
  }

  const { error: historyError } = await serviceSupabase.from("booking_reschedules").insert({
    booking_id: booking.id,
    old_starts_at: booking.starts_at,
    old_ends_at: booking.ends_at,
    new_starts_at: nextStartsAt,
    new_ends_at: nextEndsAt,
    changed_by: userId,
    reason: reason ?? null,
    is_admin_override: actorRole === "admin" && Boolean(evaluation.flags.requires_override_reason),
  });

  if (historyError) {
    console.error("Failed to persist booking reschedule history:", historyError);
    return internalRescheduleError();
  }

  const summaryResult = await getBookingSummaryById(serviceSupabase, booking.id);
  if (summaryResult.error || !summaryResult.booking) {
    console.error(
      "Failed to load updated booking after reschedule:",
      summaryResult.error ?? "Missing booking summary",
    );
    return internalRescheduleError();
  }

  try {
    await logBookingAction({
      serviceSupabase,
      bookingId: booking.id,
      actionType: "reschedule",
      actorUserId: userId,
      actorRole,
      decision: "approved",
      decisionReason: evaluation.reason,
      policySnapshot: evaluation.policySnapshot,
      metadata: {
        reason: reason ?? null,
        requested_change: {
          new_starts_at: nextStartsAt,
          new_ends_at: nextEndsAt,
        },
        reschedule_count_before: rescheduleCountResult.count,
      },
    });
  } catch (error) {
    console.error("Failed to log reschedule:", error);
  }

  const scheduledLabel = `${format(new Date(nextStartsAt), "MMM d, yyyy")} ${format(
    new Date(nextStartsAt),
    "h:mm a",
  )} - ${format(new Date(nextEndsAt), "h:mm a")}`;
  const previousScheduledLabel = `${format(new Date(booking.starts_at), "MMM d, yyyy")} ${format(
    new Date(booking.starts_at),
    "h:mm a",
  )} - ${format(new Date(booking.ends_at), "h:mm a")}`;

  try {
    await notifyAdminsForBookingEvent({
      supabase: serviceSupabase,
      eventType: "booking_rescheduled",
      bookingId: booking.id,
      title: actorRole === "admin" ? "Booking rescheduled by admin" : "Booking rescheduled by customer",
      body:
        actorRole === "admin"
          ? `Booking moved from ${previousScheduledLabel} to ${scheduledLabel}${reason ? `. Reason: ${reason}` : ""}.`
          : `Customer moved the booking from ${previousScheduledLabel} to ${scheduledLabel}${reason ? `. Reason: ${reason}` : ""}.`,
      linkUrl: adminLinkUrl,
      actorUserId: actorRole === "admin" ? userId : null,
      dedupeKey: `admin:booking_rescheduled:${booking.id}`,
      meta: {
        booking_id: booking.id,
        previous_starts_at_label: previousScheduledLabel,
        new_starts_at_label: scheduledLabel,
        reason: reason ?? null,
        actor_role: actorRole,
      },
    });
  } catch (notificationError) {
    console.error("Failed to notify admins about booking reschedule:", notificationError);
  }

  revalidatePath("/customer/bookings");
  revalidatePath(`/customer/bookings/${booking.id}`);

  return NextResponse.json({
    data: {
      booking: summaryResult.booking,
    },
  });
}
