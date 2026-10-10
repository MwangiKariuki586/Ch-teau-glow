import { addMinutes, format, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAdminBookingNotificationLink,
  buildBookingNotificationLink,
  insertNotificationWithFallback,
} from "@/lib/notifications/server";
import { notifyAdminsForBookingEvent } from "@/lib/notifications/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.discriminatedUnion("response", [
  z.object({
    response: z.literal("accepted"),
  }),
  z.object({
    response: z.literal("declined"),
    message: z.string().trim().max(500).optional(),
  }),
  z.object({
    response: z.literal("proposed_new_time"),
    customer_proposed_starts_at: z.string().datetime({ offset: true }),
    customer_proposed_ends_at: z.string().datetime({ offset: true }),
    message: z.string().trim().max(500).optional(),
  }),
]);

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
      { error: "Invalid request body.", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const serviceSupabase = await createServiceRoleClient("booking_policy");
  const bookingId = parsedParams.data.id;

  const { data: booking, error: bookingError } = await serviceSupabase
    .from("bookings")
    .select("id,user_id,service_id,branch_id,specialist_id,status,starts_at,ends_at,service:services(name,duration_minutes),branch:branches(name)")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 400 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data: changeRequest, error: changeRequestError } = await serviceSupabase
    .from("booking_change_requests")
    .select("id,booking_id,status,proposed_starts_at,proposed_ends_at,reason,requested_by,requested_at")
    .eq("booking_id", bookingId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (changeRequestError) {
    return NextResponse.json({ error: changeRequestError.message }, { status: 400 });
  }

  if (!changeRequest) {
    return NextResponse.json(
      { error: "There is no pending reschedule request for this booking." },
      { status: 404 },
    );
  }

  const nowIso = new Date().toISOString();
  const adminLinkUrl = buildAdminBookingNotificationLink(bookingId);
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

  if (parsedBody.data.response === "accepted") {
    const { error: bookingUpdateError } = await serviceSupabase
      .from("bookings")
      .update({
        starts_at: changeRequest.proposed_starts_at,
        ends_at: changeRequest.proposed_ends_at,
        status: "confirmed",
      })
      .eq("id", bookingId);

    if (bookingUpdateError) {
      return NextResponse.json({ error: bookingUpdateError.message }, { status: 400 });
    }

    const { error: requestUpdateError } = await serviceSupabase
      .from("booking_change_requests")
      .update({
        status: "accepted",
        responded_by: user.id,
        responded_at: nowIso,
        customer_response: "accepted",
      })
      .eq("id", changeRequest.id)
      .eq("status", "pending");

    if (requestUpdateError) {
      return NextResponse.json({ error: requestUpdateError.message }, { status: 400 });
    }

    await serviceSupabase.from("booking_reschedules").insert({
      booking_id: bookingId,
      old_starts_at: booking.starts_at,
      old_ends_at: booking.ends_at,
      new_starts_at: changeRequest.proposed_starts_at,
      new_ends_at: changeRequest.proposed_ends_at,
      changed_by: user.id,
      reason: changeRequest.reason,
      is_admin_override: false,
    });

    await serviceSupabase.from("booking_actions").insert({
      booking_id: bookingId,
      action_type: "reschedule",
      actor_user_id: user.id,
      actor_role: "customer",
      decision: "approved",
      decision_reason: "Customer accepted admin reschedule request.",
      policy_snapshot: {},
      metadata: {
        mode: "request_accepted",
        booking_change_request_id: changeRequest.id,
        reason: changeRequest.reason,
        old_starts_at: booking.starts_at,
        old_ends_at: booking.ends_at,
        new_starts_at: changeRequest.proposed_starts_at,
        new_ends_at: changeRequest.proposed_ends_at,
      },
    });

    const newTimeLabel = format(parseISO(changeRequest.proposed_starts_at), "MMM d, yyyy h:mm a");
    await insertNotificationWithFallback({
      supabase: serviceSupabase,
      userId: user.id,
      kind: "booking_reschedule_accepted",
      dedupeKey: `booking_reschedule_accepted:${bookingId}:${changeRequest.id}`,
      title: "Reschedule confirmed",
      body: `Your appointment has been updated to ${newTimeLabel}.`,
      linkUrl: buildBookingNotificationLink(bookingId),
      payload: {
        booking_id: bookingId,
        booking_change_request_id: changeRequest.id,
        new_starts_at_label: newTimeLabel,
        previous_starts_at_label: format(parseISO(booking.starts_at), "MMM d, yyyy h:mm a"),
        reason: changeRequest.reason,
      },
    });

    await notifyAdminsForBookingEvent({
      supabase: serviceSupabase,
      eventType: "booking_reschedule_accepted",
      bookingId,
      title: "Reschedule accepted",
      body: `${toRelationName(booking.service, "Booking")} is now set for ${newTimeLabel}.`,
      linkUrl: adminLinkUrl,
      dedupeKey: `admin:booking_reschedule_accepted:${bookingId}:${changeRequest.id}`,
      meta: {
        booking_id: bookingId,
        booking_change_request_id: changeRequest.id,
        new_starts_at_label: newTimeLabel,
        previous_starts_at_label: format(parseISO(booking.starts_at), "MMM d, yyyy h:mm a"),
        reason: changeRequest.reason,
      },
    });

    revalidatePath(`/customer/bookings/${bookingId}`);
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/customer/bookings");
    revalidatePath("/notifications");

    return NextResponse.json({
      data: {
        booking: {
          id: bookingId,
          status: "confirmed",
          starts_at: changeRequest.proposed_starts_at,
          ends_at: changeRequest.proposed_ends_at,
        },
        request: {
          id: changeRequest.id,
          status: "accepted",
        },
      },
    });
  }

  if (parsedBody.data.response === "declined") {
    const message = parsedBody.data.message?.trim() || null;

    const { error: requestUpdateError } = await serviceSupabase
      .from("booking_change_requests")
      .update({
        status: "declined",
        responded_by: user.id,
        responded_at: nowIso,
        customer_response: "declined",
        customer_message: message,
      })
      .eq("id", changeRequest.id)
      .eq("status", "pending");

    if (requestUpdateError) {
      return NextResponse.json({ error: requestUpdateError.message }, { status: 400 });
    }

    await serviceSupabase.from("booking_actions").insert({
      booking_id: bookingId,
      action_type: "reschedule",
      actor_user_id: user.id,
      actor_role: "customer",
      decision: "denied",
      decision_reason: "Customer declined admin reschedule request.",
      policy_snapshot: {},
      metadata: {
        mode: "request_declined",
        booking_change_request_id: changeRequest.id,
        reason: changeRequest.reason,
        customer_message: message,
      },
    });

    await notifyAdminsForBookingEvent({
      supabase: serviceSupabase,
      eventType: "booking_reschedule_declined",
      bookingId,
      title: "Reschedule declined",
      body: message
        ? `The customer declined the proposed time. Message: ${message}`
        : "The customer declined the proposed reschedule.",
      linkUrl: adminLinkUrl,
      dedupeKey: `admin:booking_reschedule_declined:${bookingId}:${changeRequest.id}`,
      meta: {
        booking_id: bookingId,
        booking_change_request_id: changeRequest.id,
        previous_starts_at_label: format(parseISO(booking.starts_at), "MMM d, yyyy h:mm a"),
        proposed_starts_at_label: format(parseISO(changeRequest.proposed_starts_at), "MMM d, yyyy h:mm a"),
        reason: changeRequest.reason,
        customer_message: message,
      },
    });

    revalidatePath(`/customer/bookings/${bookingId}`);
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/customer/bookings");

    return NextResponse.json({
      data: {
        request: {
          id: changeRequest.id,
          status: "declined",
          customer_response: "declined",
        },
      },
    });
  }

  const customerProposedStartsAt = parseISO(parsedBody.data.customer_proposed_starts_at);
  const customerProposedEndsAt = parseISO(parsedBody.data.customer_proposed_ends_at);

  if (
    Number.isNaN(customerProposedStartsAt.getTime()) ||
    Number.isNaN(customerProposedEndsAt.getTime()) ||
    customerProposedEndsAt <= customerProposedStartsAt
  ) {
    return NextResponse.json(
      { error: "Choose a valid alternative time." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(serviceDuration) || serviceDuration <= 0) {
    return NextResponse.json(
      { error: "Service duration is unavailable for this booking." },
      { status: 400 },
    );
  }

  const expectedCustomerEndsAt = addMinutes(customerProposedStartsAt, serviceDuration).toISOString();
  if (expectedCustomerEndsAt !== customerProposedEndsAt.toISOString()) {
    return NextResponse.json(
      { error: "The proposed slot does not match the service duration." },
      { status: 400 },
    );
  }

  const customerMessage = parsedBody.data.message?.trim() || null;

  const { error: requestUpdateError } = await serviceSupabase
    .from("booking_change_requests")
    .update({
      status: "countered",
      responded_by: user.id,
      responded_at: nowIso,
      customer_response: "proposed_new_time",
      customer_message: customerMessage,
      customer_proposed_starts_at: customerProposedStartsAt.toISOString(),
      customer_proposed_ends_at: customerProposedEndsAt.toISOString(),
    })
    .eq("id", changeRequest.id)
    .eq("status", "pending");

  if (requestUpdateError) {
    return NextResponse.json({ error: requestUpdateError.message }, { status: 400 });
  }

  await serviceSupabase.from("booking_actions").insert({
    booking_id: bookingId,
    action_type: "reschedule",
    actor_user_id: user.id,
    actor_role: "customer",
    decision: "denied",
    decision_reason: "Customer proposed a different time for admin reschedule request.",
    policy_snapshot: {},
    metadata: {
      mode: "customer_proposed_new_time",
      booking_change_request_id: changeRequest.id,
      reason: changeRequest.reason,
      customer_message: customerMessage,
      customer_proposed_starts_at: customerProposedStartsAt.toISOString(),
      customer_proposed_ends_at: customerProposedEndsAt.toISOString(),
    },
  });

  const serviceName = toRelationName(booking.service, "your service");
  const branchName = toRelationName(booking.branch, "your branch");
  const customerProposedLabel = format(customerProposedStartsAt, "MMM d, yyyy h:mm a");

  await notifyAdminsForBookingEvent({
    supabase: serviceSupabase,
    eventType: "booking_reschedule_countered",
    bookingId,
    title: "Action required: customer proposed a new time",
    body: `${serviceName} at ${branchName}: ${format(parseISO(booking.starts_at), "MMM d, yyyy h:mm a")} -> ${customerProposedLabel}${customerMessage ? `. Message: ${customerMessage}` : ""}`,
    linkUrl: adminLinkUrl,
    dedupeKey: `admin:booking_reschedule_countered:${bookingId}:${changeRequest.id}`,
    meta: {
      booking_id: bookingId,
      booking_change_request_id: changeRequest.id,
      service_name: serviceName,
      branch_name: branchName,
      reason: changeRequest.reason,
      customer_message: customerMessage,
      customer_proposed_starts_at_label: customerProposedLabel,
      previous_starts_at_label: format(parseISO(booking.starts_at), "MMM d, yyyy h:mm a"),
    },
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/customer/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/customer/bookings");
  revalidatePath("/notifications");

  return NextResponse.json({
    data: {
      request: {
        id: changeRequest.id,
        status: "countered",
        customer_response: "proposed_new_time",
        customer_proposed_starts_at: customerProposedStartsAt.toISOString(),
        customer_proposed_ends_at: customerProposedEndsAt.toISOString(),
      },
    },
  });
}

