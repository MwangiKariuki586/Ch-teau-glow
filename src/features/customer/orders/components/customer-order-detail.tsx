"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeftIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyFromCents } from "@/features/public/shop/lib/cart";
import type { CustomerOrder } from "../lib/customer-orders-data";

interface CustomerOrderDetailProps {
  initialOrder: CustomerOrder;
  sessionId: string | null;
  checkoutSucceeded: boolean;
}

export function CustomerOrderDetail({
  initialOrder,
  sessionId,
  checkoutSucceeded,
}: CustomerOrderDetailProps) {
  const [order, setOrder] = useState(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(
    checkoutSucceeded && initialOrder.paymentStatus !== "paid",
  );

  useEffect(() => {
    if (!checkoutSucceeded || !sessionId || order.paymentStatus === "paid") {
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
        if (!active || !payload.data) {
          return;
        }

        setOrder(payload.data as CustomerOrder);
        if (payload.data.paymentStatus === "paid" || attempts >= 5) {
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
  }, [checkoutSucceeded, order.paymentStatus, sessionId]);

  const displayOrderStatus =
    order.status === "paid" || checkoutSucceeded ? "paid" : order.status;
  const displayPaymentStatus =
    order.paymentStatus === "paid" || checkoutSucceeded ? "paid" : order.paymentStatus;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <Link
        href="/customer/orders"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to My Orders
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Order Details</h1>
        <p className="mt-1 text-muted-foreground">
          Order placed on {format(new Date(order.createdAt), "MMM dd, yyyy 'at' hh:mm a")}
        </p>
      </div>

      {isRefreshing && (
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          Confirming Stripe payment on your order
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 p-4"
              >
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <p className="font-semibold">
                  {formatMoneyFromCents(item.lineTotalAmountCents, item.currency)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-medium">{order.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{displayOrderStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium">{displayPaymentStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fulfillment</span>
                <span className="font-medium">
                  {order.fulfillmentType === "shipping" ? "Shipping" : "Store pickup"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-base">
                <span className="font-medium">Total</span>
                <span className="font-semibold">
                  {formatMoneyFromCents(order.totalAmountCents, order.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{order.contactName ?? order.contactEmail}</p>
              {order.contactPhone && <p>{order.contactPhone}</p>}
              <p>{order.contactEmail}</p>
              {order.fulfillmentType === "shipping" ? (
                <>
                  <p>{order.shippingAddressLine1}</p>
                  {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
                  <p>
                    {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
                  </p>
                  <p>{order.shippingCountry}</p>
                </>
              ) : (
                <p>{order.pickupNotes || "Pickup selected at checkout."}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
