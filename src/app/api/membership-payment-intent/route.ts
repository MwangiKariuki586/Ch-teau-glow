import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripeServer } from "@/lib/stripe/server";
import { PLAN_CATALOG, isPlanTier } from "@/lib/plans/catalog";

const membershipPaymentIntentSchema = z.object({
  plan_slug: z.string().min(1),
  amount_cents: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = membershipPaymentIntentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { plan_slug, amount_cents } = validation.data;

    // Validate plan exists
    if (!isPlanTier(plan_slug)) {
      return NextResponse.json(
        { error: "Invalid membership plan" },
        { status: 400 }
      );
    }

    const plan = PLAN_CATALOG[plan_slug];

    // Verify amount matches plan price
    if (amount_cents !== plan.priceCents) {
      return NextResponse.json(
        { error: "Amount mismatch with plan price" },
        { status: 400 }
      );
    }

    // Create Stripe Payment Intent
    const stripe = getStripeServer();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: plan.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        user_email: user.email || "",
        plan_slug: plan.slug,
        plan_name: plan.name,
        type: "membership_subscription",
      },
      description: `Château Glow ${plan.name} Membership`,
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      amount_cents: amount_cents,
      currency: plan.currency,
    });
  } catch (error) {
    console.error("Membership payment intent creation error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
