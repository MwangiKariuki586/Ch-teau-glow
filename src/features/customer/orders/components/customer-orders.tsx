"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Package2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoneyFromCents } from "@/features/public/shop/lib/cart";
import type { CustomerOrder } from "../lib/customer-orders-data";

interface CustomerOrdersProps {
  orders: CustomerOrder[];
}

export function CustomerOrders({ orders }: CustomerOrdersProps) {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Orders</h1>
          <p className="mt-1 text-muted-foreground">
            Review your shop purchases and fulfillment details.
          </p>
        </div>
        <Button asChild>
          <Link href="/shop">Shop Products</Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="rounded-full bg-muted p-4 text-muted-foreground">
              <Package2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">No orders yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Purchases from the shop will appear here once you complete checkout.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/customer/orders/${order.id}`}>
              <Card className="border-border/50 shadow-sm transition hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{order.id}</h2>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM dd, yyyy • hh:mm a")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>Status: {order.status}</span>
                      <span>Payment: {order.paymentStatus}</span>
                      <span>
                        Fulfillment: {order.fulfillmentType === "shipping" ? "Shipping" : "Pickup"}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-muted-foreground">{order.items.length} items</p>
                    <p className="text-lg font-semibold">
                      {formatMoneyFromCents(order.totalAmountCents, order.currency)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
