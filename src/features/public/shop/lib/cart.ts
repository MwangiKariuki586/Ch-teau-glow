import { z } from "zod";

export const SHOP_CART_STORAGE_KEY = "browz-shop-cart";
const CART_UPDATED_EVENT = "browz-shop-cart-updated";

export const shopCartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  image: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  priceDisplay: z.string().min(1),
  currency: z.string().min(3).max(3),
  quantity: z.number().int().positive(),
});

export type ShopCartItem = z.infer<typeof shopCartItemSchema>;

export function normalizeCartItems(items: unknown): ShopCartItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => shopCartItemSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);
}

export function readCartStorage(): ShopCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
      localStorage.getItem(SHOP_CART_STORAGE_KEY) ?? "[]",
    );
    return normalizeCartItems(parsed);
  } catch {
    return [];
  }
}

export function writeCartStorage(items: ShopCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(items));
  // Defer the event so it never fires synchronously during a render
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  }, 0);
}

export function subscribeToCartUpdates(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(CART_UPDATED_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CART_UPDATED_EVENT, handler);
  };
}

export function calculateCartSubtotalCents(items: ShopCartItem[]) {
  return items.reduce(
    (total, item) => total + calculateCartLineTotalCents(item),
    0,
  );
}

export function calculateCartLineTotalCents(item: ShopCartItem) {
  console.log("Calculating line total for item:", item);
  return Math.round(item.unitPrice * 100) * item.quantity;
}

export function formatMoneyFromCents(amountCents: number, currency: string) {
  const amount = amountCents / 100;
  console.log("Formatting amount:", amount, "Currency:", currency);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}
