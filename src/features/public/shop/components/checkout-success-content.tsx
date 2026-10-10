"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/features/public/products/hooks/use-cart";
import type { CustomerOrder } from "@/features/customer/orders/lib/customer-orders-data";
import { formatMoneyFromCents } from "@/features/public/shop/lib/cart";

interface CheckoutSuccessContentProps {
  initialOrder: CustomerOrder | null;
  sessionId: string | null;
}

export function CheckoutSuccessContent({
  initialOrder,
  sessionId,
}: CheckoutSuccessContentProps) {
  const { clearCart } = useCart();
  const [order, setOrder] = useState(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(initialOrder?.paymentStatus !== "paid");
  const hasCompletedStripeRedirect = Boolean(sessionId);
  const displayPaymentStatus =
    order?.paymentStatus === "paid" || hasCompletedStripeRedirect ? "paid" : order?.paymentStatus;

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!sessionId || order?.paymentStatus === "paid") {
      setIsRefreshing(false);
      return;
    }

    let active = true;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      try {
        const response = await fetch(`/api/shop/orders/by-session/${sessionId}`);
        if (!response.ok) {
          if (attempts >= 5 && active) {
            setIsRefreshing(false);
          }
          return;
        }

        const payload = await response.json();
        if (!active) {
          return;
        }

        setOrder(payload.data);
        if (payload.data?.paymentStatus === "paid" || attempts >= 5) {
          setIsRefreshing(false);
          return;
        }

        window.setTimeout(poll, 1500);
      } catch {
        if (active && attempts >= 5) {
          setIsRefreshing(false);
        }
      }
    };

    void poll();

    return () => {
      active = false;
    };
  }, [order?.paymentStatus, sessionId]);

  return (
    <main className="min-h-screen bg-[#F9F7F4] pb-20 pt-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="space-y-8 p-8 text-center sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {displayPaymentStatus === "paid" ? "Payment Completed" : "Checkout Complete"}
              </h1>
              <p className="text-gray-600">
                {displayPaymentStatus === "paid"
                  ? "Your payment has been confirmed and your order is now in our system."
                  : "We received your checkout and are confirming payment details now."}
              </p>
            </div>

            {isRefreshing && (
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating payment confirmation
              </div>
            )}

            {order && (
              <div className="rounded-3xl bg-gray-50 p-6 text-left">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-semibold text-gray-900">{order.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="font-semibold text-gray-900">
                      {formatMoneyFromCents(order.totalAmountCents, order.currency)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>Fulfillment: {order.fulfillmentType === "shipping" ? "Shipping" : "Store pickup"}</p>
                  <p>Payment status: {displayPaymentStatus ?? "pending"}</p>
                  <p>Items: {order.items.length}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="rounded-full bg-[#6B4423] hover:bg-[#4A2C1A]">
                <Link
                  href={
                    order
                      ? `/customer/orders/${order.id}?checkout=success${
                          sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ""
                        }`
                      : "/customer/orders"
                  }
                >
                  View My Order
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/shop">Back to Shop</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
