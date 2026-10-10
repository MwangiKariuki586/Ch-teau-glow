import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-[#F9F7F4] pb-20 pt-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="space-y-6 p-8 text-center sm:p-12">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Checkout Cancelled</h1>
              <p className="mt-2 text-gray-600">
                Your cart is still saved, so you can return and complete payment when you are ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="rounded-full bg-[#6B4423] hover:bg-[#4A2C1A]">
                <Link href="/cart">Return to Cart</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/shop">Continue Shopping</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
