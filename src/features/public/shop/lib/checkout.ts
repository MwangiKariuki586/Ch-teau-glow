import { z } from "zod";
import type { ShopCartItem } from "./cart";

export const fulfillmentTypeSchema = z.enum(["shipping", "pickup"]);

export const shippingAddressSchema = z.object({
  line1: z.string().trim().min(2, "Address line 1 is required"),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  postalCode: z.string().trim().min(2, "Postal code is required"),
  country: z.string().trim().min(2, "Country is required"),
});

const baseCheckoutSchema = z.object({
  cartItems: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    // name, slug, priceDisplay, currency are convenience fields from client state
    // but the API re-validates all pricing against the DB — these are informational only
    name: z.string().optional(),
    slug: z.string().optional(),
    unitPrice: z.number().nonnegative().optional(),
    priceDisplay: z.string().optional(),
    currency: z.string().min(3).max(3).optional(),
  })).min(1, "Your cart is empty."),
  fulfillmentType: fulfillmentTypeSchema,
  contactName: z.string().trim().min(2, "Contact name is required"),
  contactPhone: z.string().trim().min(5, "Contact phone is required"),
  pickupNotes: z.string().trim().max(500).optional(),
});

export const checkoutSessionRequestSchema = z.discriminatedUnion("fulfillmentType", [
  baseCheckoutSchema.extend({
    fulfillmentType: z.literal("shipping"),
    shippingAddress: shippingAddressSchema,
    // branchId not required for shipping — resolved server-side from app_settings
  }),
  baseCheckoutSchema.extend({
    fulfillmentType: z.literal("pickup"),
    shippingAddress: shippingAddressSchema.optional(),
    // branchId required for pickup — customer must select a branch
    branchId: z.string().regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Please select a pickup branch.",
    ),
  }),
]);

export type FulfillmentType = z.infer<typeof fulfillmentTypeSchema>;
export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>;

export interface CheckoutProductRecord {
  branch_id: string | null;
  id: string;
  name: string;
  slug: string;
  price_display: string;
  unit_price: number | null;
  price_value: number | null;
  currency: string;
  is_active: boolean;
  images: string[] | null;
}

export interface CheckoutLineItem {
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  unitPrice: number;
  unitPriceAmountCents: number;
  priceDisplay: string;
  currency: string;
  quantity: number;
  lineTotalAmountCents: number;
}

export interface ValidatedCheckoutPayload {
  fulfillmentType: FulfillmentType;
  /** Resolved fulfillment branch: customer-selected for pickup, app_settings default for shipping. */
  branchId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  pickupNotes: string | null;
  shippingAddress: z.infer<typeof shippingAddressSchema> | null;
  cartItems: ShopCartItem[];
}

function getProductUnitPrice(product: CheckoutProductRecord) {
  return product.unit_price ?? product.price_value;
}

export function buildValidatedCartItems(
  inputItems: CheckoutSessionRequest["cartItems"],
  products: CheckoutProductRecord[],
): CheckoutLineItem[] {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return inputItems.map((item) => {
    const product = productsById.get(item.productId);
    const unitPrice = product ? getProductUnitPrice(product) : null;
    if (!product || !product.is_active || unitPrice === null || !product.branch_id) {
      throw new Error("One or more products in your cart are unavailable.");
    }

    const unitPriceAmountCents = Math.round(unitPrice * 100);

    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImageUrl: product.images?.[0] ?? null,
      unitPrice,
      unitPriceAmountCents,
      priceDisplay: product.price_display,
      currency: product.currency,
      quantity: item.quantity,
      lineTotalAmountCents: unitPriceAmountCents * item.quantity,
    };
  });
}

export function sanitizeCheckoutPayload(
  payload: CheckoutSessionRequest,
  contactEmail: string,
  products: CheckoutProductRecord[],
  resolvedBranchId: string,
): ValidatedCheckoutPayload & {
  lineItems: CheckoutLineItem[];
  subtotalAmountCents: number;
  totalAmountCents: number;
  currency: string;
} {
  const lineItems = buildValidatedCartItems(payload.cartItems, products);
  if (lineItems.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const currency = lineItems[0].currency;
  if (lineItems.some((item) => item.currency !== currency)) {
    throw new Error("Cart items must share the same currency.");
  }

  const subtotalAmountCents = lineItems.reduce(
    (total, item) => total + item.lineTotalAmountCents,
    0,
  );

  return {
    fulfillmentType: payload.fulfillmentType,
    branchId: resolvedBranchId,
    contactName: payload.contactName.trim(),
    contactPhone: payload.contactPhone.trim(),
    contactEmail,
    pickupNotes:
      payload.fulfillmentType === "pickup" && payload.pickupNotes?.trim()
        ? payload.pickupNotes.trim()
        : null,
    shippingAddress:
      payload.fulfillmentType === "shipping"
        ? {
            line1: payload.shippingAddress.line1.trim(),
            line2: payload.shippingAddress.line2?.trim() || "",
            city: payload.shippingAddress.city.trim(),
            state: payload.shippingAddress.state.trim(),
            postalCode: payload.shippingAddress.postalCode.trim(),
            country: payload.shippingAddress.country.trim(),
          }
        : null,
    cartItems: lineItems.map((item) => ({
      productId: item.productId,
      name: item.productName,
      slug: item.productSlug,
      image: item.productImageUrl ?? "",
      unitPrice: item.unitPrice,
      priceDisplay: item.priceDisplay,
      currency: item.currency,
      quantity: item.quantity,
    })),
    lineItems,
    subtotalAmountCents,
    totalAmountCents: subtotalAmountCents,
    currency,
  };
}
