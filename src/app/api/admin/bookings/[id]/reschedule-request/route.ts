import { addMinutes, format, parseISO, subMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_BUFFER_MINUTES } from "@/lib/bookings/availability-config";
import { BOOKING_NON_BLOCKING_STATUS_FILTER } from "@/lib/constants/booking-status";
import {
  buildAdminBookingNotificationLink,
  buildBookingNotificationLink,
  insertNotificationWithFallback,
} from "@/lib/notifications/server";
import { notifyAdminsForBookingEvent } from "@/lib/notifications/admin";
import { getAdminSession } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  proposed_starts_at: z.string().datetime({ offset: true }),
  proposed_ends_at: z.string().datetime({ offset: true }),
  reason: z.string().trim().min(1, "Reason is required.").max(500),
  tz_offset_minutes: z.coerce.number().int().min(-840).max(840).optional(),
});

const reschedulableStatuses = new Set(["pending", "confirmed", "rescheduled"]);

function toRelationName(value: unknown, fallback: string) {
  if (!value) return fallback;
  if (Array.isArray(value)) {
    const name = value[0]?.name;
    return typeof name === "string" && name.trim() ? name.trim() : fallback;
  }
  if (typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" && name.trim() ? name.trim() : fallback;
  }
  return fallback;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

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

  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const bookingId = parsedParams.data.id;
  const { userId: actorUserId } = session.data;
  const supabase = await createServiceRoleClient("booking_policy");

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,user_id,service_id,branch_id,specialist_id,status,starts_at,ends_at,service:services(name,duration_minutes),branch:branches(name)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 400 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (!reschedulableStatuses.has(booking.status)) {
    return NextResponse.json(
      { error: "This booking cannot be rescheduled right now." },
      { status: 400 },
    );
  }

  const proposedStartsAt = parseISO(parsedBody.data.proposed_starts_at);
  const proposedEndsAt = parseISO(parsedBody.data.proposed_ends_at);

  if (
    Number.isNaN(proposedStartsAt.getTime()) ||
    Number.isNaN(proposedEndsAt.getTime()) ||
    proposedEndsAt <= proposedStartsAt
  ) {
    return NextResponse.json(
      { error: "Choose a valid proposed time range." },
      { status: 400 },
    );
  }

  const serviceRelation =
    booking.service as
      | { duration_minutes?: number | null }
      | Array<{ duration_minutes?: number | null }>
      | null;
  const serviceDuration = Number(
    Array.isArray(serviceRelation)
      ? serviceRelation[0]?.duration_minutes
      : serviceRelation?.duration_minutes,
  );

  if (!Number.isFinite(serviceDuration) || serviceDuration <= 0) {
    return NextResponse.json(
      { error: "Service duration is unavailable for this booking." },
      { status: 400 },
    );
  }

  const expectedEndsAt = addMinutes(proposedStartsAt, serviceDuration).toISOString();
  if (expectedEndsAt !== proposedEndsAt.toISOString()) {
    return NextResponse.json(
      { error: "The proposed slot does not match the service duration." },
      { status: 400 },
    );
  }

  const { data: pendingRequest, error: pendingRequestError } = await supabase
    .from("booking_change_requests")
    .select("id")
    .eq("booking_id", bookingId)
    .in("status", ["pending", "countered"])
    .maybeSingle();

  if (!pendingRequestError && pendingRequest) {
    // expire the existing active request before creating a new one
    await supabase
      .from("booking_change_requests")
      .update({ status: "expired" })
      .eq("id", pendingRequest.id);
  }

  const bufferedStartsAt = subMinutes(proposedStartsAt, SESSION_BUFFER_MINUTES).toISOString();
  const bufferedEndsAt = addMinutes(proposedEndsAt, SESSION_BUFFER_MINUTES).toISOString();

  const { data: conflictingBooking, error: conflictError } = await supabase
    .from("bookings")
    .select("id")
    .eq("specialist_id", booking.specialist_id)
    .neq("id", booking.id)
    .lt("starts_at", bufferedEndsAt)
    .gt("ends_at", bufferedStartsAt)
    .not("status", "in", BOOKING_NON_BLOCKING_STATUS_FILTER)
    .maybeSingle();

  if (conflictError) {
    return NextResponse.json({ error: conflictError.message }, { status: 400 });
  }

  if (conflictingBooking) {
    return NextResponse.json(
      {
        error: `Selected specialist is unavailable at that time (includes ${SESSION_BUFFER_MINUTES}-minute buffer).`,
      },
      { status: 409 },
    );
  }

  const reason = parsedBody.data.reason.trim();
  const { data: changeRequest, error: changeRequestError } = await supabase
    .from("booking_change_requests")
    .insert({
      booking_id: bookingId,
      type: "reschedule",
      status: "pending",
      proposed_starts_at: proposedStartsAt.toISOString(),
      proposed_ends_at: proposedEndsAt.toISOString(),
      reason,
      requested_by: actorUserId,
    })
    .select("id,proposed_starts_at,proposed_ends_at")
    .maybeSingle();

  if (changeRequestError || !changeRequest) {
    return NextResponse.json(
      { error: changeRequestError?.message ?? "The reschedule request could not be created." },
      { status: changeRequestError?.code === "23505" ? 409 : 400 },
    );
  }

  await supabase.from("booking_actions").insert({
    booking_id: bookingId,
    action_type: "reschedule",
    actor_user_id: actorUserId,
    actor_role: "admin",
    decision: "approved",
    decision_reason: "Booking reschedule request created by admin.",
    policy_snapshot: {},
    metadata: {
      mode: "request_created",
      reason,
      old_starts_at: booking.starts_at,
      old_ends_at: booking.ends_at,
      proposed_starts_at: changeRequest.proposed_starts_at,
      proposed_ends_at: changeRequest.proposed_ends_at,
      tz_offset_minutes: parsedBody.data.tz_offset_minutes ?? null,
    },
  });

  const previousLabel = format(parseISO(booking.starts_at), "MMM d, yyyy h:mm a");
  const proposedLabel = format(parseISO(changeRequest.proposed_starts_at), "MMM d, yyyy h:mm a");
  const serviceName = toRelationName(booking.service, "your service");
  const branchName = toRelationName(booking.branch, "your branch");
  const adminLinkUrl = buildAdminBookingNotificationLink(bookingId);

  await insertNotificationWithFallback({
    supabase,
    userId: booking.user_id,
    kind: "booking_reschedule_requested",
    dedupeKey: `booking_reschedule_requested:${bookingId}:${changeRequest.id}`,
    title: "Action required: confirm new time",
    body: `Proposed: ${proposedLabel} (was ${previousLabel}) at ${branchName}. Reason: ${reason}`,
    linkUrl: buildBookingNotificationLink(bookingId, { action: "reschedule" }),
    payload: {
      booking_id: bookingId,
      booking_change_request_id: changeRequest.id,
      service_name: serviceName,
      branch_name: branchName,
      reason,
      previous_starts_at_label: previousLabel,
      proposed_starts_at_label: proposedLabel,
      proposed_starts_at: changeRequest.proposed_starts_at,
      proposed_ends_at: changeRequest.proposed_ends_at,
      action_required: true,
    },
  });

  await notifyAdminsForBookingEvent({
    supabase,
    eventType: "booking_reschedule_requested",
    bookingId,
    actorUserId,
    title: "Reschedule requested",
    body: `${serviceName}: ${proposedLabel} (was ${previousLabel}). Reason: ${reason}`,
    linkUrl: adminLinkUrl,
    dedupeKey: `admin:booking_reschedule_requested:${bookingId}:${changeRequest.id}`,
    meta: {
      booking_id: bookingId,
      booking_change_request_id: changeRequest.id,
      service_name: serviceName,
      branch_name: branchName,
      previous_starts_at_label: previousLabel,
      proposed_starts_at_label: proposedLabel,
      reason,
    },
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath(`/customer/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/notifications");

  return NextResponse.json({
    data: {
      id: changeRequest.id,
      booking_id: bookingId,
      status: "pending",
      proposed_starts_at: changeRequest.proposed_starts_at,
      proposed_ends_at: changeRequest.proposed_ends_at,
      reason,
    },
  });
}
