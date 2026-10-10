"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface MembershipPaymentFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
}

export function MembershipPaymentForm({
  clientSecret,
  amount,
  currency,
  onSuccess,
  onError,
  isProcessing,
}: MembershipPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || "Payment validation failed");
        onError(submitError.message || "Payment validation failed");
        setIsSubmitting(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/membership/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        const errorMsg =
          error.type === "card_error" || error.type === "validation_error"
            ? error.message || "Payment failed"
            : "An unexpected error occurred. Please try again.";

        setErrorMessage(errorMsg);
        onError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        setErrorMessage("Payment was not completed. Please try again.");
        onError("Payment was not completed");
        setIsSubmitting(false);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(errorMsg);
      onError(errorMsg);
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isProcessing;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <div className="space-y-4">
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className="h-12 w-full rounded-full bg-[#6B4423] text-base font-semibold text-white hover:bg-[#4A2C1A]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {isProcessing ? "Processing..." : "Confirming Payment..."}
            </>
          ) : (
            `Pay ${currency?.toUpperCase()} ${Math.floor(amount / 100)}`
          )}
        </Button>

        <p className="text-center text-xs text-[#8A7660]">Secured by Stripe</p>
      </div>
    </form>
  );
}
