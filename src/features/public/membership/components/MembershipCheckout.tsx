"use client";

import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MembershipPaymentForm } from "./MembershipPaymentForm";
import { useMembershipPaymentIntent } from "../hooks/useMembershipPaymentIntent";
import type { Plan } from "@/lib/plans/catalog";
import type { User } from "@supabase/supabase-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

interface MembershipCheckoutProps {
  plan: Plan;
  user: User;
}

export function MembershipCheckout({ plan, user }: MembershipCheckoutProps) {
  const {
    clientSecret,
    amount,
    currency,
    isLoading,
    error,
    createPaymentIntent,
  } = useMembershipPaymentIntent();

  const [isProcessing, setIsProcessing] = useState(false);

  // Create payment intent on mount
  useEffect(() => {
    createPaymentIntent({
      plan_slug: plan.slug,
      amount_cents: plan.priceCents,
    });
  }, [plan.slug, plan.priceCents, createPaymentIntent]);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setIsProcessing(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success(`${plan.name} membership activated successfully!`, {
      description:
        "Welcome to Château Glow! You can now enjoy all your membership benefits.",
      duration: 4000,
    });

    setIsProcessing(false);

    // Redirect to offers page after success
    setTimeout(() => {
      window.location.href = "/offers";
    }, 2000);
  };

  const handlePaymentError = (errorMsg: string) => {
    console.error("Payment error:", errorMsg);
    toast.error(errorMsg);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-6 w-96" />
        </div>

        <div className="rounded-[30px] border border-[#E8DED2] bg-white p-8 shadow-sm">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className="mt-8 border-t border-[#F0E6DA] pt-6">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-[30px] border border-red-200 bg-red-50 p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
        <Button
          onClick={() =>
            createPaymentIntent({
              plan_slug: plan.slug,
              amount_cents: plan.priceCents,
            })
          }
          variant="default"
          className="w-full"
        >
          Retry Payment Setup
        </Button>
      </div>
    );
  }

  if (!clientSecret || amount === null || !currency) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[#2C1A12]">
          Complete Your Membership
        </h1>
        <p className="mt-2 text-base text-[#6B5A4D]">
          You're subscribing to the {plan.name} plan
        </p>
      </div>

      {/* Plan Summary */}
      <div className="rounded-[30px] border border-[#E8DED2] bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E7DB]">
                <Sparkles className="h-6 w-6 text-[#6B4423]" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[#2C1A12]">
                  {plan.name}
                </h2>
                <p className="text-sm text-[#6B5A4D]">{plan.tagline}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {plan.highlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2E7DA] text-[#6B4423]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-[#3A2A20]">{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-[#8A7660]">Monthly</p>
            <p className="text-3xl font-bold text-[#2C1A12]">
              {currency?.toUpperCase()} {Math.floor(amount / 100)}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[#F0E6DA] bg-[#FFFDF9] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A7660]">
            Secure Payment
          </p>
          <p className="mt-2 text-sm leading-6 text-[#6B5A4D]">
            Your payment information is encrypted and secure. You can cancel
            your membership anytime from your account settings.
          </p>
        </div>
      </div>

      {/* Payment Form */}
      <div className="rounded-[30px] border border-[#E8DED2] bg-white p-8 shadow-sm">
        <h3 className="mb-6 text-xl font-semibold text-[#2C1A12]">
          Payment Details
        </h3>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#6B4423",
                colorBackground: "#ffffff",
                colorText: "#2C1A12",
                colorDanger: "#df1b41",
                fontFamily: "system-ui, sans-serif",
                spacingUnit: "4px",
                borderRadius: "8px",
              },
            },
          }}
        >
          <MembershipPaymentForm
            clientSecret={clientSecret}
            amount={amount}
            currency={currency}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            isProcessing={isProcessing}
          />
        </Elements>
      </div>

      {/* Fine Print */}
      <div className="rounded-2xl border border-[#E8DED2] bg-[#FFFDF9] p-6">
        <p className="text-xs leading-relaxed text-[#8A7660]">
          By completing this purchase, you agree to our Terms of Service and
          Privacy Policy. Your membership will renew automatically each month
          unless cancelled. You can cancel anytime from your account settings.
        </p>
      </div>
    </div>
  );
}
