"use client";

import { useCallback, useState } from "react";

interface MembershipPaymentIntentParams {
  plan_slug: string;
  amount_cents: number;
}

interface MembershipPaymentIntentResponse {
  client_secret: string;
  amount_cents: number;
  currency: string;
}

interface UseMembershipPaymentIntentReturn {
  clientSecret: string | null;
  amount: number | null;
  currency: string | null;
  isLoading: boolean;
  error: string | null;
  createPaymentIntent: (params: MembershipPaymentIntentParams) => Promise<void>;
}

export function useMembershipPaymentIntent(): UseMembershipPaymentIntentReturn {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = useCallback(
    async (params: MembershipPaymentIntentParams) => {
      setIsLoading(true);
      setError(null);
      setClientSecret(null);
      setAmount(null);
      setCurrency(null);

      try {
        const response = await fetch("/api/membership-payment-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const errorData = await response.json();

          let errorMessage = "Failed to initialize payment";

          if (response.status === 401) {
            errorMessage = "Please sign in to continue with payment";
          } else if (response.status === 400) {
            errorMessage =
              errorData.error ||
              "Invalid membership information. Please try again.";
          } else if (response.status === 500) {
            errorMessage =
              "Payment system temporarily unavailable. Please try again in a moment.";
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }

          throw new Error(errorMessage);
        }

        const data: MembershipPaymentIntentResponse = await response.json();
        setClientSecret(data.client_secret);
        setAmount(data.amount_cents);
        setCurrency(data.currency);
      } catch (err) {
        let errorMessage = "Failed to initialize payment";

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (err instanceof TypeError && err.message.includes("fetch")) {
          errorMessage =
            "Network error. Please check your internet connection and try again.";
        }

        setError(errorMessage);
        console.error("Membership payment intent creation error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    clientSecret,
    amount,
    currency,
    isLoading,
    error,
    createPaymentIntent,
  };
}
