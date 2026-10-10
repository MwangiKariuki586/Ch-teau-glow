"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateCartLineTotalCents,
  calculateCartSubtotalCents,
  formatMoneyFromCents,
} from "@/features/public/shop/lib/cart";
import { useCart } from "@/features/public/products/hooks/use-cart";
import type { FulfillmentType } from "@/features/public/shop/lib/checkout";

interface CartPageProps {
  isAuthenticated: boolean;
  customerName: string;
  customerEmail: string;
  defaultBranchId?: string;
}

interface Branch {
  id: string;
  name: string;
  city: string;
}

type ShippingAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyAddress: ShippingAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "AE",
};

export function CartPage({
  isAuthenticated,
  customerName,
  customerEmail,
  defaultBranchId,
}: CartPageProps) {
  const router = useRouter();
  const { items, updateQty, removeItem } = useCart();
  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>("shipping");
  const [contactName, setContactName] = useState(customerName);
  const [contactPhone, setContactPhone] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [shippingAddress, setShippingAddress] =
    useState<ShippingAddress>(emptyAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState(
    defaultBranchId ?? "",
  );

  const subtotalAmountCents = useMemo(
    () => calculateCartSubtotalCents(items),
    [items],
  );
  const currency = items[0]?.currency ?? "AED";

  // Fetch branches for pickup selector
  useEffect(() => {
    if (fulfillmentType !== "pickup") return;
    fetch("/api/branches-list")
      .then((r) => r.json())
      .then((json) => setBranches(json.data ?? json ?? []))
      .catch(() => {});
  }, [fulfillmentType]);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      router.push("/auth/signin");
      return;
    }

    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("Please enter your contact name and phone number.");
      return;
    }

    if (fulfillmentType === "pickup" && !selectedBranchId) {
      toast.error("Please select a pickup branch.");
      return;
    }

    if (fulfillmentType === "shipping") {
      const requiredShippingFields = [
        shippingAddress.line1,
        shippingAddress.city,
        shippingAddress.state,
        shippingAddress.postalCode,
        shippingAddress.country,
      ];
      const missingShippingField = requiredShippingFields.some(
        (value) => !value.trim(),
      );
      if (missingShippingField) {
        toast.error("Please complete the shipping address before checkout.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/shop/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartItems: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            name: item.name,
            slug: item.slug,
            unitPrice: item.unitPrice,
            priceDisplay: item.priceDisplay,
            currency: item.currency,
          })),
          fulfillmentType,
          contactName,
          contactPhone,
          pickupNotes,
          ...(fulfillmentType === "pickup" && { branchId: selectedBranchId }),
          shippingAddress:
            fulfillmentType === "shipping" ? shippingAddress : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      if (!data.checkoutUrl) {
        throw new Error("Missing checkout URL.");
      }

      window.location.assign(data.checkoutUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F9F5F0] pb-20 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Your Cart</h1>
            <p className="mt-2 text-gray-600">
              Review your products and continue to secure checkout.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="rounded-full bg-[#6B4423]/10 p-5 text-[#6B4423]">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Your cart is empty
                </h2>
                <p className="mt-2 max-w-md text-gray-600">
                  Add products from the shop to begin your checkout.
                </p>
              </div>
              <Button
                asChild
                className="rounded-full bg-[#6B4423] hover:bg-[#4A2C1A]"
              >
                <Link href="/shop">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              {items.map((item) => (
                <Card
                  key={item.productId}
                  className="rounded-3xl border-0 shadow-sm"
                >
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-gray-100">
                      <Image
                        src={
                          item.image ||
                          "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500&q=80"
                        }
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {item.name}
                          </h2>
                          <p className="text-sm text-gray-500">
                            Unit price: {item.priceDisplay}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center rounded-full bg-gray-100 p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() =>
                              updateQty(item.productId, item.quantity - 1)
                            }
                            aria-label={`Decrease quantity for ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="min-w-12 px-4 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() =>
                              updateQty(item.productId, item.quantity + 1)
                            }
                            aria-label={`Increase quantity for ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-lg font-semibold text-[#6B4423]">
                          Total:{" "}
                          {formatMoneyFromCents(
                            calculateCartLineTotalCents(item),
                            item.currency,
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-6">
              <Card className="rounded-3xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Checkout Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!isAuthenticated && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      Sign in is required before checkout.
                      <div className="mt-3">
                        <Button
                          asChild
                          size="sm"
                          className="rounded-full bg-[#6B4423] hover:bg-[#4A2C1A]"
                        >
                          <Link href="/auth/signin">Sign In</Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Fulfillment</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          fulfillmentType === "shipping"
                            ? "border-[#6B4423] bg-[#6B4423]/5 text-[#6B4423]"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                        onClick={() => setFulfillmentType("shipping")}
                      >
                        Ship to address
                      </button>
                      <button
                        type="button"
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          fulfillmentType === "pickup"
                            ? "border-[#6B4423] bg-[#6B4423]/5 text-[#6B4423]"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                        onClick={() => setFulfillmentType("pickup")}
                      >
                        Store pickup
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Contact Name</Label>
                      <Input
                        id="contact-name"
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Account Email</Label>
                      <Input
                        id="contact-email"
                        value={customerEmail}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Phone Number</Label>
                      <Input
                        id="contact-phone"
                        value={contactPhone}
                        onChange={(event) =>
                          setContactPhone(event.target.value)
                        }
                        placeholder="+971..."
                      />
                    </div>
                  </div>

                  {fulfillmentType === "shipping" ? (
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="line1">Address Line 1</Label>
                        <Input
                          id="line1"
                          value={shippingAddress.line1}
                          onChange={(event) =>
                            setShippingAddress((current) => ({
                              ...current,
                              line1: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="line2">Address Line 2</Label>
                        <Input
                          id="line2"
                          value={shippingAddress.line2}
                          onChange={(event) =>
                            setShippingAddress((current) => ({
                              ...current,
                              line2: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={shippingAddress.city}
                            onChange={(event) =>
                              setShippingAddress((current) => ({
                                ...current,
                                city: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State / Emirate</Label>
                          <Input
                            id="state"
                            value={shippingAddress.state}
                            onChange={(event) =>
                              setShippingAddress((current) => ({
                                ...current,
                                state: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            value={shippingAddress.postalCode}
                            onChange={(event) =>
                              setShippingAddress((current) => ({
                                ...current,
                                postalCode: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country Code</Label>
                          <Input
                            id="country"
                            value={shippingAddress.country}
                            onChange={(event) =>
                              setShippingAddress((current) => ({
                                ...current,
                                country: event.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="AE"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="pickup-branch">
                          Pickup Branch <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={selectedBranchId}
                          onValueChange={setSelectedBranchId}
                        >
                          <SelectTrigger
                            id="pickup-branch"
                            className="rounded-xl"
                          >
                            <MapPin className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                                {branch.city ? ` — ${branch.city}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pickup-notes">Pickup Notes</Label>
                        <Textarea
                          id="pickup-notes"
                          value={pickupNotes}
                          onChange={(event) =>
                            setPickupNotes(event.target.value)
                          }
                          placeholder="Optional notes for pickup"
                          className="min-h-24"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Items (
                      {items.reduce((total, item) => total + item.quantity, 0)})
                    </span>
                    <span>
                      {formatMoneyFromCents(subtotalAmountCents, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Fulfillment</span>
                    <span>
                      {fulfillmentType === "shipping"
                        ? "Shipping"
                        : "Store pickup"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4 text-base font-semibold text-gray-900">
                    <span>Total</span>
                    <span>
                      {formatMoneyFromCents(subtotalAmountCents, currency)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    className="w-full rounded-full bg-[#6B4423] hover:bg-[#4A2C1A]"
                    disabled={isSubmitting || items.length === 0}
                    onClick={handleCheckout}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting to payment
                      </>
                    ) : (
                      "Proceed to Secure Checkout"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
