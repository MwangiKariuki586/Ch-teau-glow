import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStripeServer } from "@/lib/stripe/server";
import { reserveOrderInventory } from "@/lib/orders/reserve-order-inventory";
import {
  checkoutSessionRequestSchema,
  sanitizeCheckoutPayload,
  type CheckoutProductRecord,
} from "@/features/public/shop/lib/checkout";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return NextResponse.json(
      { error: "Authentication required to checkout." },
      { status: 401 },
    );
  }

  const payload = checkoutSessionRequestSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid checkout payload.", issues: payload.error.issues },
      { status: 400 },
    );
  }

  const serviceSupabase = await createServiceRoleClient("shop_checkout_write");
  const productIds = Array.from(new Set(payload.data.cartItems.map((item) => item.productId)));
  const { data: products, error: productsError } = await serviceSupabase
    .from("products")
    .select("id,name,slug,price_display,unit_price,price_value,currency,is_active,images,branch_id")
    .in("id", productIds);

  if (productsError) {
    console.error("Failed to fetch checkout products:", productsError.message);
    return NextResponse.json(
      { error: "Unable to validate your cart right now." },
      { status: 500 },
    );
  }

  // Resolve fulfillment branch:
  // - pickup: customer-selected branchId from payload (already validated by Zod)
  // - shipping: read default from app_settings
  let resolvedBranchId: string;

  if (payload.data.fulfillmentType === "pickup") {
    resolvedBranchId = payload.data.branchId;
  } else {
    const { data: setting } = await serviceSupabase
      .from("app_settings")
      .select("value")
      .eq("key", "default_fulfillment_branch_id")
      .single();

    // app_settings stores values as JSONB — string values are stored as JSON strings (with quotes)
    // e.g. value = '"uuid-here"' so we parse it out
    const rawValue = setting?.value;
    const defaultBranchId =
      typeof rawValue === "string"
        ? rawValue
        : typeof rawValue === "object" && rawValue !== null && "value" in rawValue
        ? String((rawValue as Record<string, unknown>).value)
        : null;
    if (!defaultBranchId) {
      console.error("default_fulfillment_branch_id not configured in app_settings");
      return NextResponse.json(
        { error: "Shipping fulfillment is not configured. Please contact support." },
        { status: 500 },
      );
    }
    resolvedBranchId = defaultBranchId;
  }

  let checkoutData: ReturnType<typeof sanitizeCheckoutPayload>;

  try {
    checkoutData = sanitizeCheckoutPayload(
      payload.data,
      user.email,
      (products ?? []) as CheckoutProductRecord[],
      resolvedBranchId,
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid checkout data." },
      { status: 400 },
    );
  }

  const { data: order, error: orderError } = await serviceSupabase
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      payment_status: "pending",
      currency: checkoutData.currency,
      subtotal_amount_cents: checkoutData.subtotalAmountCents,
      total_amount_cents: checkoutData.totalAmountCents,
      fulfillment_type: checkoutData.fulfillmentType,
      branch_id: checkoutData.branchId,
      contact_email: checkoutData.contactEmail,
      contact_name: checkoutData.contactName,
      contact_phone: checkoutData.contactPhone,
      pickup_notes: checkoutData.pickupNotes,
      shipping_address_line1: checkoutData.shippingAddress?.line1 ?? null,
      shipping_address_line2: checkoutData.shippingAddress?.line2 || null,
      shipping_city: checkoutData.shippingAddress?.city ?? null,
      shipping_state: checkoutData.shippingAddress?.state ?? null,
      shipping_postal_code: checkoutData.shippingAddress?.postalCode ?? null,
      shipping_country: checkoutData.shippingAddress?.country ?? null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Failed to create pending order:", orderError);
    return NextResponse.json(
      { error: "Unable to start checkout right now." },
      { status: 500 },
    );
  }

  const { error: orderItemsError } = await serviceSupabase
    .from("order_items")
    .insert(
      checkoutData.lineItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        product_slug: item.productSlug,
        product_image_url: item.productImageUrl,
        unit_price_amount_cents: item.unitPriceAmountCents,
        quantity: item.quantity,
        line_total_amount_cents: item.lineTotalAmountCents,
        currency: item.currency,
      })),
    );

  if (orderItemsError) {
    console.error("Failed to create order items:", orderItemsError);
    await serviceSupabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: "Unable to save your cart for checkout." },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripeServer();
    const origin = request.nextUrl.origin;
    const successUrl = new URL("/checkout/success", origin);
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    successUrl.searchParams.set("order_id", order.id);

    const cancelUrl = new URL("/checkout/cancel", origin);
    cancelUrl.searchParams.set("order_id", order.id);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: order.id,
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      line_items: checkoutData.lineItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: item.currency.toLowerCase(),
          unit_amount: item.unitPriceAmountCents,
          product_data: {
            name: item.productName,
            images: item.productImageUrl ? [item.productImageUrl] : [],
            metadata: {
              product_id: item.productId,
              product_slug: item.productSlug,
            },
          },
        },
      })),
      metadata: {
        order_id: order.id,
        user_id: user.id,
        fulfillment_type: checkoutData.fulfillmentType,
        contact_name: checkoutData.contactName,
        contact_phone: checkoutData.contactPhone,
        pickup_notes: checkoutData.pickupNotes ?? "",
      },
      shipping_address_collection:
        checkoutData.fulfillmentType === "shipping"
          ? { allowed_countries: ["AE"] }
          : undefined,
    });

    await serviceSupabase
      .from("orders")
      .update({ stripe_checkout_session_id: checkoutSession.id })
      .eq("id", order.id);

    try {
      await reserveOrderInventory(order.id);
    } catch (reservationError) {
      console.error("Failed to reserve inventory for order:", {
        order_id: order.id,
        error: reservationError,
      });
      await serviceSupabase.from("order_items").delete().eq("order_id", order.id);
      await serviceSupabase.from("orders").delete().eq("id", order.id);

      return NextResponse.json(
        { error: "Unable to reserve inventory for your order right now." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { checkoutUrl: checkoutSession.url, sessionId: checkoutSession.id, orderId: order.id },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    await serviceSupabase.from("order_items").delete().eq("order_id", order.id);
    await serviceSupabase.from("orders").delete().eq("id", order.id);

    return NextResponse.json(
      { error: "Unable to redirect to payment right now." },
      { status: 500 },
    );
  }
}
