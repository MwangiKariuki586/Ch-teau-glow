import { addMinutes, format, parseISO, subMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_BUFFER_MINUTES } from "@/lib/bookings/availability-config";
import {
  BOOKING_DEFAULT_STATUS,
  BOOKING_NON_BLOCKING_STATUS_FILTER,
} from "@/lib/constants/booking-status";
import { getStripeServer } from "@/lib/stripe/server";
import { notifyAdminsForBookingEvent } from "@/lib/notifications/admin";
import { buildAdminBookingNotificationLink } from "@/lib/notifications/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { validateBookingConsistency } from "@/lib/validation/booking-validation";
import { fulfillWaitlistOfferAfterBooking } from "@/lib/waitlist/server";

const createBookingSchema = z.object({
  service_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  specialist_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  package_id: z.string().uuid().optional(),
  waitlist_offer_id: z.string().uuid().optional(),
  waitlist_offer_group_id: z.string().uuid().optional(),
  waitlist_notification_id: z.string().uuid().optional(),
  payment_intent_id: z.string().min(1, "Payment intent ID is required"),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  let verifiedPaymentIntent:
    | Awaited<ReturnType<ReturnType<typeof getStripeServer>["paymentIntents"]["retrieve"]>>
    | null = null;
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = createBookingSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid booking payload.", issues: payload.error.issues },
      { status: 400 },
    );
  }

  const {
    service_id,
    branch_id,
    specialist_id,
    starts_at,
    package_id,
    waitlist_offer_id,
    waitlist_offer_group_id,
    waitlist_notification_id,
    payment_intent_id,
    notes,
  } = payload.data;

  // Verify payment intent status
  try {
    const stripe = getStripeServer();
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    verifiedPaymentIntent = paymentIntent;

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment has not been completed. Please complete payment before booking." },
        { status: 400 }
      );
    }

    // Verify payment amount matches (optional but recommended)
    if (paymentIntent.metadata.user_id !== user.id) {
      return NextResponse.json(
        { error: "Payment verification failed." },
        { status: 403 }
      );
    }

    if (paymentIntent.metadata.service_id !== service_id) {
      return NextResponse.json(
        { error: "Payment verification failed for the selected service." },
        { status: 403 }
      );
    }

    if (paymentIntent.metadata.entry_service_id && paymentIntent.metadata.entry_service_id !== service_id) {
      return NextResponse.json(
        { error: "Payment verification failed for the selected package entry service." },
        { status: 403 }
      );
    }

    const metadataBookingKind =
      paymentIntent.metadata.booking_kind === "package" ? "package" : "service";
    const metadataPackageId = paymentIntent.metadata.package_id?.trim() || null;

    if (metadataBookingKind === "package") {
      if (!metadataPackageId) {
        return NextResponse.json(
          { error: "Package payment verification failed." },
          { status: 403 }
        );
      }

      if (package_id && package_id !== metadataPackageId) {
        return NextResponse.json(
          { error: "Payment verification failed for the selected package." },
          { status: 403 }
        );
      }
    } else if (package_id) {
      return NextResponse.json(
        { error: "Package verification failed." },
        { status: 403 }
      );
    }

    const metadataFinalAmount = Number(paymentIntent.metadata.final_amount_minor);
    if (!Number.isFinite(metadataFinalAmount) || paymentIntent.amount !== metadataFinalAmount) {
      return NextResponse.json(
        { error: "Payment amount verification failed." },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment. Please contact support." },
      { status: 500 }
    );
  }

  // Comprehensive validation using the new validation utility
  const validationResult = await validateBookingConsistency(supabase, {
    specialist_id,
    branch_id,
    service_id
  });

  if (!validationResult.isValid) {
    const primaryError = validationResult.errors[0];
    return NextResponse.json(
      { 
        error: primaryError.message,
        validation_errors: validationResult.errors
      },
      { status: 400 }
    );
  }

  // Get service details for duration
  const { data: service } = await supabase
    .from("services")
    .select("id,name,duration_minutes,status")
    .eq("id", service_id)
    .eq("status", "published")
    .maybeSingle();

  if (!service) {
    return NextResponse.json(
      { error: "Selected service is unavailable." },
      { status: 400 },
    );
  }

  const durationMinutes = Number(service.duration_minutes);
  const slotStart = parseISO(starts_at);
  const slotEnd = addMinutes(slotStart, durationMinutes);
  const bufferedSlotStart = subMinutes(slotStart, SESSION_BUFFER_MINUTES);
  const bufferedSlotEnd = addMinutes(slotEnd, SESSION_BUFFER_MINUTES);

  const { data: conflictingBooking } = await supabase
    .from("bookings")
    .select("id,status")
    .eq("specialist_id", specialist_id)
    .lt("starts_at", bufferedSlotEnd.toISOString())
    .gt("ends_at", bufferedSlotStart.toISOString())
    .not("status", "in", BOOKING_NON_BLOCKING_STATUS_FILTER)
    .maybeSingle();

  if (conflictingBooking) {
    return NextResponse.json(
      {
        error: `This specialist is unavailable around the selected time (${SESSION_BUFFER_MINUTES}-minute buffer).`,
        waitlist_redirect_url:
          waitlist_offer_id && waitlist_offer_group_id
            ? waitlist_notification_id
              ? `/notifications/${encodeURIComponent(waitlist_notification_id)}?failed_slot=${encodeURIComponent(waitlist_offer_id)}`
              : `/waitlist/offers/${encodeURIComponent(waitlist_offer_group_id)}?failed_slot=${encodeURIComponent(waitlist_offer_id)}`
            : null,
      },
      { status: 409 },
    );
  }

  try {
    const serviceSupabase = await createServiceRoleClient("booking_policy");
    const bookingKind =
      verifiedPaymentIntent?.metadata.booking_kind === "package" ? "package" : "service";
    const packageId =
      bookingKind === "package"
        ? verifiedPaymentIntent?.metadata.package_id?.trim() || null
        : null;
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        booking_kind: bookingKind,
        package_id: packageId,
        service_id,
        branch_id,
        specialist_id,
        starts_at: slotStart.toISOString(),
        ends_at: slotEnd.toISOString(),
        status: BOOKING_DEFAULT_STATUS,
        payment_intent_id,
        payment_status: "succeeded",
        payment_amount_cents: verifiedPaymentIntent?.amount ?? null,
        payment_currency: verifiedPaymentIntent?.currency?.toUpperCase() ?? null,
        notes: notes?.trim() ? notes.trim() : null,
      })
      .select("id,user_id,booking_kind,package_id,service_id,branch_id,specialist_id,starts_at,ends_at,status")
      .single();

    if (error) {
      if (error.code === "23505") {
        // Check if it's a duplicate payment_intent_id
        if (error.message.includes("payment_intent_id")) {
          return NextResponse.json(
            { error: "This payment has already been used for a booking." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error: `This specialist is unavailable around the selected time (${SESSION_BUFFER_MINUTES}-minute buffer).`,
            waitlist_redirect_url:
              waitlist_offer_id && waitlist_offer_group_id
                ? waitlist_notification_id
                  ? `/notifications/${encodeURIComponent(waitlist_notification_id)}?failed_slot=${encodeURIComponent(waitlist_offer_id)}`
                  : `/waitlist/offers/${encodeURIComponent(waitlist_offer_group_id)}?failed_slot=${encodeURIComponent(waitlist_offer_id)}`
                : null,
          },
          { status: 409 },
        );
      }

      // Handle database constraint violations with descriptive messages
      if (error.message.includes('booking_consistency_trigger')) {
        return NextResponse.json(
          { error: "Booking validation failed - please check your selections and try again." },
          { status: 400 }
        );
      }

      // Critical: payment succeeded but booking failed
      console.error("CRITICAL: Booking creation failed after payment", {
        payment_intent_id,
        user_id: user.id,
        error: error.message,
      });

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const scheduledLabel = `${format(new Date(data.starts_at), "MMM d, yyyy")} ${format(
      new Date(data.starts_at),
      "h:mm a",
    )} - ${format(new Date(data.ends_at), "h:mm a")}`;

    const [{ data: customerProfile }, { data: branch }, { data: specialist }, { data: packageRecord }] = await Promise.all([
      serviceSupabase
        .from("user_profiles")
        .select("full_name,email")
        .eq("user_id", user.id)
        .maybeSingle(),
      serviceSupabase.from("branches").select("name").eq("id", branch_id).maybeSingle(),
      serviceSupabase.from("specialists").select("full_name").eq("id", specialist_id).maybeSingle(),
      packageId
        ? serviceSupabase.from("packages").select("name").eq("id", packageId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const bookingLabel =
      bookingKind === "package"
        ? `${packageRecord?.name ?? "Package"} intake`
        : service?.name ?? "Service";

    try {
      await notifyAdminsForBookingEvent({
        supabase: serviceSupabase,
        eventType: "booking_created",
        bookingId: data.id,
        title: "New booking created",
        body: `${bookingLabel} booked for ${scheduledLabel}${customerProfile?.full_name ? ` by ${customerProfile.full_name}` : ""}.`,
        linkUrl: buildAdminBookingNotificationLink(data.id),
        dedupeKey: `admin:booking_created:${data.id}`,
        meta: {
          booking_id: data.id,
          booking_kind: bookingKind,
          package_id: packageId,
          package_name: packageRecord?.name ?? null,
          scheduled_at_label: scheduledLabel,
          service_name: service?.name ?? null,
          customer_name: customerProfile?.full_name ?? null,
          customer_email: customerProfile?.email ?? null,
          branch_name: branch?.name ?? null,
          specialist_name: specialist?.full_name ?? null,
        },
      });
    } catch (notificationError) {
      console.error("Failed to notify admins about booking creation:", notificationError);
    }

    if (waitlist_offer_id) {
      try {
        await fulfillWaitlistOfferAfterBooking({
          userId: user.id,
          offerId: waitlist_offer_id,
          offerGroupId: waitlist_offer_group_id,
          bookingId: data.id,
          serviceId: service_id,
          branchId: branch_id,
          specialistId: specialist_id,
          startsAt: slotStart.toISOString(),
          supabase: serviceSupabase,
        });
      } catch (waitlistError) {
        console.error("Failed to fulfil waitlist offer after booking:", waitlistError);
      }
    }

    return NextResponse.json({ data }, { status: 201 });

  } catch (error) {
    // Critical: payment succeeded but booking failed
    console.error("CRITICAL: Booking creation exception after payment", {
      payment_intent_id,
      user_id: user.id,
      error,
    });
    
    return NextResponse.json(
      { error: "Failed to create booking. Please try again." },
      { status: 500 }
    );
  }
}
