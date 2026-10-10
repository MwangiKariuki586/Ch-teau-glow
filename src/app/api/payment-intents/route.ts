import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateBookingAmount } from "@/lib/payment/amount-calculator";
import { getStripeServer } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { validateBookingConsistency } from "@/lib/validation/booking-validation";

const createPaymentIntentSchema = z.object({
  service_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  specialist_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  package_id: z.string().uuid().optional(),
  offer_id: z.string().uuid().optional(),
  code: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const payload = createPaymentIntentSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid request payload.", issues: payload.error.issues },
        { status: 400 }
      );
    }

    const {
      service_id,
      branch_id,
      specialist_id,
      starts_at,
      package_id,
      offer_id,
      code,
    } = payload.data;

    // Validate booking data consistency
    const validationResult = await validateBookingConsistency(supabase, {
      specialist_id,
      branch_id,
      service_id,
    });

    if (!validationResult.isValid) {
      const primaryError = validationResult.errors[0];
      return NextResponse.json(
        {
          error: primaryError.message,
          validation_errors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Calculate payment amount
    const pricing = await calculateBookingAmount({
      serviceId: service_id,
      specialistId: specialist_id,
      branchId: branch_id,
      packageId: package_id,
      offerId: offer_id,
      code,
    });

    const bookingKind = pricing.applied_package ? "package" : "service";

    // Create Stripe Payment Intent
    const stripe = getStripeServer();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.final_amount_minor,
      currency: pricing.currency.toLowerCase(),
      metadata: {
        service_id,
        branch_id,
        specialist_id,
        starts_at,
        user_id: user.id,
        booking_kind: bookingKind,
        package_id: pricing.applied_package?.id ?? "",
        package_slug: pricing.applied_package?.slug ?? "",
        entry_service_id: service_id,
        offer_id: pricing.applied_offer?.id ?? "",
        offer_code: pricing.applied_offer?.code ?? code ?? "",
        base_amount_minor: String(pricing.base_amount_minor),
        discount_amount_minor: String(pricing.discount_amount_minor),
        final_amount_minor: String(pricing.final_amount_minor),
        currency: pricing.currency,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json(
      {
        client_secret: paymentIntent.client_secret,
        amount_cents: pricing.final_amount_minor,
        currency: pricing.currency,
        base_amount_minor: pricing.base_amount_minor,
        discount_amount_minor: pricing.discount_amount_minor,
        final_amount_minor: pricing.final_amount_minor,
        applied_offer: pricing.applied_offer,
        applied_package: pricing.applied_package,
        booking_kind: bookingKind,
        validation_status: pricing.validation_status,
        validation_message: pricing.validation_message,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Payment intent creation error:", error);

    if (error instanceof Error) {
      // Handle Stripe-specific errors
      if (error.message.includes("Stripe")) {
        return NextResponse.json(
          { error: "Payment system temporarily unavailable. Please try again." },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to initialize payment. Please try again." },
      { status: 500 }
    );
  }
}
