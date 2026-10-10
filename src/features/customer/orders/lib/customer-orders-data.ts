import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CustomerOrderStatus = "pending" | "paid" | "cancelled" | "fulfilled";
export type CustomerOrderPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";
export type CustomerOrderFulfillmentType = "shipping" | "pickup";

export interface CustomerOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  productSlug: string | null;
  productImageUrl: string | null;
  quantity: number;
  currency: string;
  unitPriceAmountCents: number;
  lineTotalAmountCents: number;
}

export interface CustomerOrder {
  id: string;
  status: CustomerOrderStatus;
  paymentStatus: CustomerOrderPaymentStatus;
  fulfillmentType: CustomerOrderFulfillmentType;
  currency: string;
  subtotalAmountCents: number;
  totalAmountCents: number;
  contactEmail: string;
  contactName: string | null;
  contactPhone: string | null;
  pickupNotes: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  stripeCheckoutSessionId: string | null;
  createdAt: string;
  placedAt: string | null;
  items: CustomerOrderItem[];
}

type OrderItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  product_image_url: string | null;
  quantity: number;
  currency: string;
  unit_price_amount_cents: number;
  line_total_amount_cents: number;
};

type OrderRow = {
  id: string;
  status: CustomerOrderStatus;
  payment_status: CustomerOrderPaymentStatus;
  fulfillment_type: CustomerOrderFulfillmentType;
  currency: string;
  subtotal_amount_cents: number;
  total_amount_cents: number;
  contact_email: string;
  contact_name: string | null;
  contact_phone: string | null;
  pickup_notes: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  stripe_checkout_session_id: string | null;
  created_at: string;
  placed_at: string | null;
  order_items: OrderItemRow[] | null;
};

function normalizeOrder(row: OrderRow): CustomerOrder {
  return {
    id: row.id,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentType: row.fulfillment_type,
    currency: row.currency,
    subtotalAmountCents: row.subtotal_amount_cents,
    totalAmountCents: row.total_amount_cents,
    contactEmail: row.contact_email,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    pickupNotes: row.pickup_notes,
    shippingAddressLine1: row.shipping_address_line1,
    shippingAddressLine2: row.shipping_address_line2,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state,
    shippingPostalCode: row.shipping_postal_code,
    shippingCountry: row.shipping_country,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    createdAt: row.created_at,
    placedAt: row.placed_at,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      productSlug: item.product_slug,
      productImageUrl: item.product_image_url,
      quantity: item.quantity,
      currency: item.currency,
      unitPriceAmountCents: item.unit_price_amount_cents,
      lineTotalAmountCents: item.line_total_amount_cents,
    })),
  };
}

const orderSelect =
  "id,status,payment_status,fulfillment_type,currency,subtotal_amount_cents,total_amount_cents,contact_email,contact_name,contact_phone,pickup_notes,shipping_address_line1,shipping_address_line2,shipping_city,shipping_state,shipping_postal_code,shipping_country,stripe_checkout_session_id,created_at,placed_at,order_items(id,product_id,product_name,product_slug,product_image_url,quantity,currency,unit_price_amount_cents,line_total_amount_cents)";

export async function getCustomerOrders(userId: string): Promise<CustomerOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch customer orders:", error.message);
    return [];
  }

  return ((data ?? []) as OrderRow[]).map(normalizeOrder);
}

export async function getCustomerOrderById(
  userId: string,
  orderId: string,
): Promise<CustomerOrder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("user_id", userId)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to fetch customer order:", error.message);
    }
    return null;
  }

  return normalizeOrder(data as OrderRow);
}

export async function getCustomerOrderBySessionId(
  userId: string,
  sessionId: string,
): Promise<CustomerOrder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("user_id", userId)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to fetch customer order by session:", error.message);
    }
    return null;
  }

  return normalizeOrder(data as OrderRow);
}
