import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlanBySlug } from "@/lib/plans/catalog";
import { getStripeServer } from "@/lib/stripe/server";

const requestSchema = z.object({
  planSlug: z.string().min(1),
  email: z.string().email().optional(),
});

function getAppUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    request.nextUrl.origin
  );
}

export async function POST(request: NextRequest) {
  const body = requestSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid checkout request.", issues: body.error.issues },
      { status: 400 },
    );
  }

  const plan = getPlanBySlug(body.data.planSlug);
  if (!plan) {
    return NextResponse.json({ error: "Selected plan was not found." }, { status: 404 });
  }

  if (!plan.stripePriceId) {
    return NextResponse.json(
      {
        error:
          "This membership is not connected to Stripe yet. Add the plan price ID in your environment configuration.",
      },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeServer();
    const baseUrl = getAppUrl(request);
    const successUrl = new URL("/plans/success", baseUrl);
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    successUrl.searchParams.set("plan", plan.slug);

    const cancelUrl = new URL(`/plans/${plan.slug}`, baseUrl);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: body.data.email,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      metadata: {
        purchase_type: "membership",
        planSlug: plan.slug,
        planName: plan.name,
      },
      subscription_data: {
        metadata: {
          purchase_type: "membership",
          planSlug: plan.slug,
          planName: plan.name,
        },
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Failed to create membership checkout session:", error);
    return NextResponse.json(
      { error: "Unable to start secure checkout right now." },
      { status: 500 },
    );
  }
}
