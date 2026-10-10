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
import { getAdminSession, type AdminSessionResult } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
  }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().trim().min(1, "Reason is required.").max(500),
  }),
  z.object({
    action: z.literal("reschedule"),
    starts_at: z.string().datetime({ offset: true }),
    reason: z.string().trim().min(1, "Reason is required.").max(500),
  }),
]);

const approvableStatuses = new Set(["pending", "rescheduled"]);
const rejectableStatuses = new Set(["pending", "confirmed", "rescheduled"]);
const reschedulableStatuses = new Set(["pending", "confirmed", "rescheduled"]);

type AdminBookingActionType = "approve" | "reject" | "reschedule";

async function insertAdminBookingAction(params: {
  supabase: AdminSessionResult["supabase"];
  bookingId: string;
  actorUserId: string;
  actionType: AdminBookingActionType;
  decision: "approved" | "denied";
  decisionReason: string;
  policySnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await params.supabase.from("booking_actions").insert({
    booking_id: params.bookingId,
    action_type: params.actionType,
    actor_user_id: params.actorUserId,
    actor_role: "admin",
    decision: params.decision,
    decision_reason: params.decisionReason,
    policy_snapshot: params.policySnapshot ?? {},
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("Failed to insert admin booking action audit row:", error);
  }
}

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

export async function GET(
  _request: Request,
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

  const bookingId = parsedParams.data.id;
  const supabase = await createServiceRoleClient("admin_bookings_read");

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id,user_id,booking_kind,package_id,service_id,branch_id,specialist_id,booking_channel,booking_channel_meta,starts_at,ends_at,status,notes,rejection_reason,created_at,guest_name,guest_phone,guest_email,payment_status,payment_amount_cents,payment_currency,package:packages(id,name,slug),service:services(id,name,slug,min_price_cents,max_price_cents,currency,duration_minutes),branch:branches(id,name,city,country,address),specialist:specialists(id,name,title)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 400 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  let profile: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null = null;
  if (booking.user_id) {
    const { data } = await supabase
      .from("user_profiles")
      .select("first_name,last_name,email,phone")
      .eq("user_id", booking.user_id)
      .maybeSingle();
    profile = data;
  }

  const { data: actionRows } = await supabase
    .from("booking_actions")
    .select("id,action_type,actor_role,decision,decision_reason,created_at,metadata")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: rescheduleRows } = await supabase
    .from("booking_reschedules")
    .select("id,old_starts_at,old_ends_at,new_starts_at,new_ends_at,changed_at,reason,is_admin_override")
    .eq("booking_id", bookingId)
    .order("changed_at", { ascending: false })
    .limit(5);

  let changeRequestRows: Array<Record<string, unknown>> = [];
  try {
    const { data } = await supabase
      .from("booking_change_requests")
      .select(
        "id,type,status,proposed_starts_at,proposed_ends_at,reason,requested_at,customer_response,customer_message,customer_proposed_starts_at,customer_proposed_ends_at,responded_at",
      )
      .eq("booking_id", bookingId)
      .order("requested_at", { ascending: false })
      .limit(5);

    changeRequestRows = data ?? [];
  } catch {
    changeRequestRows = [];
  }

  return NextResponse.json({
    data: {
      booking,
      customer: {
        id: booking.user_id,
        name:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          profile?.email?.split("@")[0] ||
          booking.guest_name ||
          "Customer",
        email: profile?.email || booking.guest_email || "Unknown",
        phone: profile?.phone || booking.guest_phone || null,
      },
      audit_trail: actionRows ?? [],
      reschedule_history: rescheduleRows ?? [],
      change_requests: changeRequestRows ?? [],
    },
  });
}

export async function PATCH(
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

  const parsedBody = actionSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const bookingId = parsedParams.data.id;
  const { supabase, userId: actorUserId } = session.data;

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,user_id,booking_kind,package_id,service_id,branch_id,specialist_id,status,notes,rejection_reason,starts_at,ends_at,package:packages(name),service:services(name),branch:branches(name)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 400 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const serviceName = toRelationName(booking.service, "your service");
  const packageName = toRelationName((booking as { package?: unknown }).package, "your package");
  const bookingLabel = booking.booking_kind === "package" ? packageName : serviceName;
  const branchName = toRelationName(booking.branch, "your branch");
  const currentStartsAtLabel = format(parseISO(booking.starts_at), "MMM d, yyyy h:mm a");
  const adminLinkUrl = buildAdminBookingNotificationLink(bookingId);

  if (parsedBody.data.action === "approve") {
    if (!approvableStatuses.has(booking.status)) {
      await insertAdminBookingAction({
        supabase,
        bookingId,
        actorUserId,
        actionType: "approve",
        decision: "denied",
        decisionReason: "Only pending/rescheduled bookings can be approved.",
        metadata: {
          previous_status: booking.status,
        },
      });
      return NextResponse.json(
        { error: "Only pending/rescheduled bookings can be approved." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await insertAdminBookingAction({
      supabase,
      bookingId,
      actorUserId,
      actionType: "approve",
      decision: "approved",
      decisionReason: "Booking approved by admin.",
      metadata: {
        previous_status: booking.status,
        next_status: "confirmed",
      },
    });

    await insertNotificationWithFallback({
      supabase,
      userId: booking.user_id,
      linkUrl: buildBookingNotificationLink(bookingId),
      kind: "booking_approved",
      dedupeKey: `booking_approved:${bookingId}`,
      title: "Booking confirmed",
      body: `${bookingLabel} on ${currentStartsAtLabel} at ${branchName} is now confirmed.`,
      payload: {
        booking_id: bookingId,
        service_name: serviceName,
        package_name: booking.booking_kind === "package" ? packageName : null,
        branch_name: branchName,
        confirmed_status: "confirmed",
        confirmed_starts_at_label: currentStartsAtLabel,
      },
    });

    await notifyAdminsForBookingEvent({
      supabase,
      eventType: "booking_approved",
      bookingId,
      actorUserId,
      title: "Booking approved",
      body: `${bookingLabel} on ${currentStartsAtLabel} at ${branchName} was approved.`,
      linkUrl: adminLinkUrl,
      dedupeKey: `admin:booking_approved:${bookingId}`,
      meta: {
        booking_id: bookingId,
        service_name: serviceName,
        package_name: booking.booking_kind === "package" ? packageName : null,
        branch_name: branchName,
        scheduled_at_label: currentStartsAtLabel,
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/customer/bookings");
    revalidatePath(`/customer/bookings/${bookingId}`);
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/notifications");

    return NextResponse.json({ data: { id: bookingId, status: "confirmed" } });
  }

  if (parsedBody.data.action === "reject") {
    if (!rejectableStatuses.has(booking.status)) {
      await insertAdminBookingAction({
        supabase,
        bookingId,
        actorUserId,
        actionType: "reject",
        decision: "denied",
        decisionReason: "Only pending/confirmed/rescheduled bookings can be rejected.",
        metadata: {
          previous_status: booking.status,
        },
      });
      return NextResponse.json(
        { error: "Only pending/confirmed/rescheduled bookings can be rejected." },
        { status: 400 },
      );
    }

    const reason = parsedBody.data.reason.trim();
    const mergedNotes = `${booking.notes ? `${booking.notes}\n\n` : ""}Admin cancellation reason: ${reason}`;

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "rejected",
        notes: mergedNotes,
        rejection_reason: reason,
      })
      .eq("id", bookingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await insertAdminBookingAction({
      supabase,
      bookingId,
      actorUserId,
      actionType: "reject",
      decision: "approved",
      decisionReason: "Booking rejected by admin.",
      metadata: {
        previous_status: booking.status,
        next_status: "rejected",
        reason,
      },
    });

    await insertNotificationWithFallback({
      supabase,
      userId: booking.user_id,
      linkUrl: buildBookingNotificationLink(bookingId),
      kind: "booking_rejected",
      dedupeKey: `booking_rejected:${bookingId}`,
      title: "Booking not approved",
      body: `Reason: ${reason}`,
      payload: {
        booking_id: bookingId,
        reason,
      },
    });

    await notifyAdminsForBookingEvent({
      supabase,
      eventType: "booking_rejected",
      bookingId,
      actorUserId,
      title: "Booking rejected",
      body: `${bookingLabel} on ${currentStartsAtLabel} was rejected. Reason: ${reason}`,
      linkUrl: adminLinkUrl,
      dedupeKey: `admin:booking_rejected:${bookingId}`,
      meta: {
        booking_id: bookingId,
        service_name: serviceName,
        package_name: booking.booking_kind === "package" ? packageName : null,
        branch_name: branchName,
        scheduled_at_label: currentStartsAtLabel,
        reason,
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/customer/bookings");
    revalidatePath(`/customer/bookings/${bookingId}`);
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/notifications");

    return NextResponse.json({ data: { id: bookingId, status: "rejected" } });
  }

  if (!reschedulableStatuses.has(booking.status)) {
    await insertAdminBookingAction({
      supabase,
      bookingId,
      actorUserId,
      actionType: "reschedule",
      decision: "denied",
      decisionReason: "Only pending/confirmed/rescheduled bookings can be rescheduled.",
      metadata: {
        previous_status: booking.status,
      },
    });
    return NextResponse.json(
      { error: "Only pending/confirmed/rescheduled bookings can be rescheduled." },
      { status: 400 },
    );
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", booking.service_id)
    .maybeSingle();

  if (serviceError || !service) {
    return NextResponse.json(
      { error: serviceError?.message ?? "Service context is unavailable." },
      { status: 400 },
    );
  }

  const startsAt = parseISO(parsedBody.data.starts_at);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid reschedule time." }, { status: 400 });
  }

  if (startsAt <= new Date()) {
    return NextResponse.json(
      { error: "Rescheduled time must be in the future." },
      { status: 400 },
    );
  }

  const endsAt = addMinutes(startsAt, Number(service.duration_minutes));
  const bufferedStartsAt = subMinutes(startsAt, SESSION_BUFFER_MINUTES).toISOString();
  const bufferedEndsAt = addMinutes(endsAt, SESSION_BUFFER_MINUTES).toISOString();

  const { data: conflictBooking, error: conflictError } = await supabase
    .from("bookings")
    .select("id")
    .eq("specialist_id", booking.specialist_id)
    .lt("starts_at", bufferedEndsAt)
    .gt("ends_at", bufferedStartsAt)
    .neq("id", bookingId)
    .not("status", "in", BOOKING_NON_BLOCKING_STATUS_FILTER)
    .maybeSingle();

  if (conflictError) {
    return NextResponse.json({ error: conflictError.message }, { status: 400 });
  }

  if (conflictBooking) {
    const conflictMessage = `Selected specialist is unavailable at that time (includes ${SESSION_BUFFER_MINUTES}-minute buffer).`;
    await insertAdminBookingAction({
      supabase,
      bookingId,
      actorUserId,
      actionType: "reschedule",
      decision: "denied",
      decisionReason: conflictMessage,
      metadata: {
        previous_status: booking.status,
        requested_starts_at: startsAt.toISOString(),
        requested_ends_at: endsAt.toISOString(),
        reason: parsedBody.data.reason.trim(),
        conflict_booking_id: conflictBooking.id,
      },
    });
    return NextResponse.json(
      { error: conflictMessage },
      { status: 409 },
    );
  }

  const reason = parsedBody.data.reason.trim();
  const mergedRescheduleNotes = `${booking.notes ? `${booking.notes}\n\n` : ""}Admin reschedule reason: ${reason}`;
  const previousStartsAtLabel = currentStartsAtLabel;
  const newStartsAtLabel = format(startsAt, "MMM d, yyyy h:mm a");

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "rescheduled",
      notes: mergedRescheduleNotes,
    })
    .eq("id", bookingId);

  if (updateError) {
    if (updateError.code === "23505") {
      const conflictMessage = `Selected specialist is unavailable at that time (includes ${SESSION_BUFFER_MINUTES}-minute buffer).`;
      await insertAdminBookingAction({
        supabase,
        bookingId,
        actorUserId,
        actionType: "reschedule",
        decision: "denied",
        decisionReason: conflictMessage,
        metadata: {
          previous_status: booking.status,
          requested_starts_at: startsAt.toISOString(),
          requested_ends_at: endsAt.toISOString(),
          reason: parsedBody.data.reason.trim(),
        },
      });
      return NextResponse.json(
        { error: conflictMessage },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await insertAdminBookingAction({
    supabase,
    bookingId,
    actorUserId,
    actionType: "reschedule",
    decision: "approved",
    decisionReason: "Booking rescheduled by admin.",
    metadata: {
      previous_status: booking.status,
      next_status: "rescheduled",
      reason,
      old_starts_at: booking.starts_at,
      old_ends_at: booking.ends_at,
      new_starts_at: startsAt.toISOString(),
      new_ends_at: endsAt.toISOString(),
    },
  });

  await insertNotificationWithFallback({
    supabase,
    userId: booking.user_id,
    linkUrl: buildBookingNotificationLink(bookingId),
    kind: "booking_rescheduled",
    dedupeKey: `booking_rescheduled:${bookingId}:${startsAt.toISOString()}`,
    title: "Your booking was rescheduled",
    body: `Your new appointment time is ${newStartsAtLabel}. Reason: ${reason}`,
    payload: {
      booking_id: bookingId,
      reason,
      previous_starts_at_label: previousStartsAtLabel,
      new_starts_at_label: newStartsAtLabel,
    },
  });

  await notifyAdminsForBookingEvent({
    supabase,
    eventType: "booking_reschedule_requested",
    bookingId,
    actorUserId,
    title: "Reschedule requested",
    body: `${bookingLabel} was rescheduled to ${newStartsAtLabel}. Reason: ${reason}`,
    linkUrl: adminLinkUrl,
    dedupeKey: `admin:booking_reschedule_requested:${bookingId}`,
    meta: {
      booking_id: bookingId,
      service_name: serviceName,
      package_name: booking.booking_kind === "package" ? packageName : null,
      branch_name: branchName,
      previous_starts_at_label: previousStartsAtLabel,
      new_starts_at_label: newStartsAtLabel,
      reason,
    },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/customer/bookings");
  revalidatePath(`/customer/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/notifications");

  return NextResponse.json({
    data: {
      id: bookingId,
      status: "rescheduled",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    },
  });
}

