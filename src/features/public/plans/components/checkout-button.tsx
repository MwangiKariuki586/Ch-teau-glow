"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plan } from "@/lib/plans/catalog";

export function MembershipCheckoutPanel({
  plan,
  initialEmail = "",
}: {
  plan: Plan;
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/plans/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planSlug: plan.slug,
          email: email.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to open secure checkout.");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open secure checkout.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-[28px] border border-[#E8DED2] bg-white py-0 shadow-[0_20px_60px_rgba(61,34,18,0.08)]">
      <CardHeader className="px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E7DB] text-[#6B4423]">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A7660]">Payment</p>
            <CardTitle className="mt-1 text-xl text-[#2C1A12]">Proceed to secure checkout</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <div className="space-y-2">
          <label htmlFor="membership-email" className="text-sm font-medium text-[#3A2A20]">
            Email
          </label>
          <Input
            id="membership-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-11 rounded-2xl border-[#DECFBF] bg-[#FFFCF8] px-4 text-[#2C1A12] placeholder:text-[#A08C78] focus-visible:border-[#C9A96E]"
          />
          <p className="text-xs leading-5 text-[#8A7660]">
            If you leave this blank, Stripe will collect your email during checkout.
          </p>
        </div>

        <div className="rounded-[24px] border border-dashed border-[#E5D4C3] bg-[#FCF8F2] p-4">
          <p className="text-sm font-medium text-[#3A2A20]">Stripe hosted checkout</p>
          <p className="mt-2 text-sm leading-6 text-[#6B5A4D]">
            Payment details stay on Stripe. This page does not capture or submit card data.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-[#EEE2D5] bg-white px-4 py-3">
          <Checkbox
            checked={termsAccepted}
            onCheckedChange={(value) => setTermsAccepted(value === true)}
            className="mt-0.5 border-[#CDB8A2]"
          />
          <span className="text-sm leading-6 text-[#5E4C3E]">
            I understand membership billing and management features are still being rolled out.
          </span>
        </label>

        <Button
          type="button"
          onClick={handleCheckout}
          disabled={isLoading || !termsAccepted}
          className="h-11 w-full rounded-full bg-[#6B4423] text-white hover:bg-[#4A2C1A]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to Stripe
            </>
          ) : (
            "Proceed to secure checkout"
          )}
        </Button>

        <div className="space-y-1 text-xs leading-5 text-[#8A7660]">
          <p>Secure checkout powered by Stripe.</p>
          <p>Cancel anytime management is coming soon.</p>
        </div>
      </CardContent>
    </Card>
  );
}
