/**
 * Stripe webhook event handlers
 */

import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { finalizeOrderCheckoutSession } from "@/lib/orders/finalize-order-payment";

/**
 * Handles payment_intent.succeeded event
 * Updates booking payment status to succeeded
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const supabase = await createServiceRoleClient("webhook_payment_status");

  try {
    // Find booking by payment_intent_id
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, payment_status")
      .eq("payment_intent_id", paymentIntent.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching booking for payment intent:", {
        payment_intent_id: paymentIntent.id,
        error: fetchError,
      });
      return;
    }

    if (!booking) {
      // Booking doesn't exist yet - payment succeeded before booking created
      // This is handled by the booking creation flow
      console.log("Payment succeeded but booking not found yet:", {
        payment_intent_id: paymentIntent.id,
      });
      return;
    }

    // Update payment status if not already succeeded
    if (booking.payment_status !== "succeeded") {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          payment_status: "succeeded",
          payment_amount_cents: paymentIntent.amount,
          payment_currency: paymentIntent.currency,
        })
        .eq("id", booking.id);

      if (updateError) {
        console.error("Error updating booking payment status:", {
          booking_id: booking.id,
          payment_intent_id: paymentIntent.id,
          error: updateError,
        });
      } else {
        console.log("Booking payment status updated to succeeded:", {
          booking_id: booking.id,
          payment_intent_id: paymentIntent.id,
        });
      }
    }
  } catch (error) {
    console.error("Error handling payment_intent.succeeded:", {
      payment_intent_id: paymentIntent.id,
      error,
    });
  }
}

/**
 * Handles payment_intent.payment_failed event
 * Updates booking payment status to failed
 */
export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const supabase = await createServiceRoleClient("webhook_payment_status");

  try {
    // Find booking by payment_intent_id
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, payment_status")
      .eq("payment_intent_id", paymentIntent.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching booking for failed payment:", {
        payment_intent_id: paymentIntent.id,
        error: fetchError,
      });
      return;
    }

    if (!booking) {
      // No booking exists for this payment intent
      console.log("Payment failed but no booking found:", {
        payment_intent_id: paymentIntent.id,
      });
      return;
    }

    // Update payment status to failed
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: "failed",
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error("Error updating booking payment status to failed:", {
        booking_id: booking.id,
        payment_intent_id: paymentIntent.id,
        error: updateError,
      });
    } else {
      console.log("Booking payment status updated to failed:", {
        booking_id: booking.id,
        payment_intent_id: paymentIntent.id,
      });
    }
  } catch (error) {
    console.error("Error handling payment_intent.payment_failed:", {
      payment_intent_id: paymentIntent.id,
      error,
    });
  }
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.warn("Checkout session completed without order_id metadata", {
      session_id: session.id,
    });
    return;
  }

  const customerDetails = session.customer_details;
  //@ts-ignore
  const shippingDetails = session.shipping_details;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const placedAt = new Date(session.created * 1000).toISOString();

  if (session.payment_status !== "paid") {
    const supabase = await createServiceRoleClient("webhook_payment_status");
    const { error } = await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: customerId,
        contact_email: customerDetails?.email ?? undefined,
        contact_name:
          shippingDetails?.name ??
          customerDetails?.name ??
          session.metadata?.contact_name ??
          undefined,
        contact_phone:
          customerDetails?.phone ?? session.metadata?.contact_phone ?? undefined,
        shipping_address_line1: shippingDetails?.address?.line1 ?? undefined,
        shipping_address_line2: shippingDetails?.address?.line2 ?? undefined,
        shipping_city: shippingDetails?.address?.city ?? undefined,
        shipping_state: shippingDetails?.address?.state ?? undefined,
        shipping_postal_code: shippingDetails?.address?.postal_code ?? undefined,
        shipping_country: shippingDetails?.address?.country ?? undefined,
        placed_at: placedAt,
        pickup_notes: session.metadata?.pickup_notes || undefined,
      })
      .eq("id", orderId);

    if (error) {
      throw new Error(`Failed to update unpaid order ${orderId}: ${error.message}`);
    }

    return;
  }

  await finalizeOrderCheckoutSession({
    orderId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCustomerId: customerId,
    contactEmail: customerDetails?.email ?? null,
    contactName:
      shippingDetails?.name ??
      customerDetails?.name ??
      session.metadata?.contact_name ??
      null,
    contactPhone:
      customerDetails?.phone ?? session.metadata?.contact_phone ?? null,
    shippingAddressLine1: shippingDetails?.address?.line1 ?? null,
    shippingAddressLine2: shippingDetails?.address?.line2 ?? null,
    shippingCity: shippingDetails?.address?.city ?? null,
    shippingState: shippingDetails?.address?.state ?? null,
    shippingPostalCode: shippingDetails?.address?.postal_code ?? null,
    shippingCountry: shippingDetails?.address?.country ?? null,
    placedAt,
    pickupNotes: session.metadata?.pickup_notes || null,
  });
}

export async function handleMembershipCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  console.log("Membership checkout completed:", {
    session_id: session.id,
    customer_id: typeof session.customer === "string" ? session.customer : null,
    customer_email: session.customer_details?.email ?? null,
    plan_slug: session.metadata?.planSlug ?? null,
    payment_status: session.payment_status,
    subscription_id: typeof session.subscription === "string" ? session.subscription : null,
  });
}

export async function handleMembershipSubscriptionEvent(
  subscription: Stripe.Subscription,
  eventType: string,
): Promise<void> {
  console.log("Membership subscription event:", {
    event_type: eventType,
    subscription_id: subscription.id,
    customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
    status: subscription.status,
    plan_slug: subscription.metadata?.planSlug ?? null,
  });
}
