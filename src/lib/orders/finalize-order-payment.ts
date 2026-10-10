import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface FinalizeOrderCheckoutSessionInput {
  orderId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  contactEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  placedAt: string | null;
  pickupNotes: string | null;
}

export interface FinalizeOrderCheckoutSessionResult {
  status: "processed" | "already_processed";
  order_id: string;
  inserted_movements: number;
}

export async function finalizeOrderCheckoutSession(
  input: FinalizeOrderCheckoutSessionInput,
): Promise<FinalizeOrderCheckoutSessionResult> {
  const supabase = await createServiceRoleClient("webhook_payment_status");

  const { data, error } = await supabase.rpc("finalize_order_checkout_session", {
    p_order_id: input.orderId,
    p_stripe_checkout_session_id: input.stripeCheckoutSessionId,
    p_stripe_payment_intent_id: input.stripePaymentIntentId,
    p_stripe_customer_id: input.stripeCustomerId,
    p_contact_email: input.contactEmail,
    p_contact_name: input.contactName,
    p_contact_phone: input.contactPhone,
    p_shipping_address_line1: input.shippingAddressLine1,
    p_shipping_address_line2: input.shippingAddressLine2,
    p_shipping_city: input.shippingCity,
    p_shipping_state: input.shippingState,
    p_shipping_postal_code: input.shippingPostalCode,
    p_shipping_country: input.shippingCountry,
    p_placed_at: input.placedAt,
    p_pickup_notes: input.pickupNotes,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (
    !data ||
    typeof data !== "object" ||
    !("status" in data) ||
    !("order_id" in data) ||
    !("inserted_movements" in data)
  ) {
    throw new Error("Unexpected finalize_order_checkout_session response.");
  }

  return data as FinalizeOrderCheckoutSessionResult;
}
