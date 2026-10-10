import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeServer } from "@/lib/stripe/server";
import {
  handleCheckoutSessionCompleted,
  handleMembershipCheckoutCompleted,
  handleMembershipSubscriptionEvent,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
} from "@/lib/stripe/webhook-handlers";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 401 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook configuration error" },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripeServer();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Route events to appropriate handlers
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "checkout.session.completed":
        {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.metadata?.purchase_type === "membership") {
            await handleMembershipCheckoutCompleted(session);
          } else {
            await handleCheckoutSessionCompleted(session);
          }
        }
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        {
          const subscription = event.data.object as Stripe.Subscription;
          if (subscription.metadata?.purchase_type === "membership") {
            await handleMembershipSubscriptionEvent(subscription, event.type);
          } else {
            console.log(`Unhandled non-membership subscription event: ${event.type}`);
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      console.warn("Invalid webhook signature", { error: error.message });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    console.error("Webhook processing error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
