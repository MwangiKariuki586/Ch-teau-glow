/**
 * usePaymentIntent hook
 * Manages payment intent creation and state
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PaymentIntentOfferSummary,
  PaymentIntentParams,
  PaymentIntentResponse,
} from "../types";

interface UsePaymentIntentReturn {
  clientSecret: string | null;
  amount: number | null;
  currency: string | null;
  baseAmount: number | null;
  discountAmount: number | null;
  appliedOffer: PaymentIntentOfferSummary | null;
  validationMessage: string | null;
  isLoading: boolean;
  error: string | null;
  createPaymentIntent: (params: PaymentIntentParams) => Promise<void>;
  cancelPaymentIntent: () => Promise<void>;
}

export function usePaymentIntent(): UsePaymentIntentReturn {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [baseAmount, setBaseAmount] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [appliedOffer, setAppliedOffer] = useState<PaymentIntentOfferSummary | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientSecretRef = useRef<string | null>(null);

  useEffect(() => {
    clientSecretRef.current = clientSecret;
  }, [clientSecret]);

  const createPaymentIntent = useCallback(async (params: PaymentIntentParams) => {
    setIsLoading(true);
    setError(null);
    setClientSecret(null);
    setAmount(null);
    setCurrency(null);
    setBaseAmount(null);
    setDiscountAmount(null);
    setAppliedOffer(null);
    setValidationMessage(null);

    try {
      const response = await fetch("/api/payment-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Provide user-friendly error messages based on status code
        let errorMessage = "Failed to initialize payment";
        
        if (response.status === 401) {
          errorMessage = "Please sign in to continue with payment";
        } else if (response.status === 400) {
          errorMessage = errorData.error || "Invalid booking information. Please go back and verify your selections.";
        } else if (response.status === 500) {
          errorMessage = "Payment system temporarily unavailable. Please try again in a moment.";
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        throw new Error(errorMessage);
      }

      const data: PaymentIntentResponse = await response.json();
      setClientSecret(data.client_secret);
      setAmount(data.amount_cents);
      setCurrency(data.currency);
      setBaseAmount(data.base_amount_minor);
      setDiscountAmount(data.discount_amount_minor);
      setAppliedOffer(data.applied_offer);
      setValidationMessage(data.validation_message);
    } catch (err) {
      let errorMessage = "Failed to initialize payment";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      setError(errorMessage);
      console.error("Payment intent creation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelPaymentIntent = useCallback(async () => {
    const currentClientSecret = clientSecretRef.current;
    if (!currentClientSecret) return;

    try {
      const paymentIntentId = currentClientSecret.split("_secret_")[0];
      
      // Call Stripe API to cancel the payment intent
      await fetch("/api/payment-intents/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      });

      // Clear local state
      setClientSecret(null);
      setAmount(null);
      setCurrency(null);
      setBaseAmount(null);
      setDiscountAmount(null);
      setAppliedOffer(null);
      setValidationMessage(null);
      setError(null);
    } catch (err) {
      console.error("Payment intent cancellation error:", err);
      // Don't throw - cancellation is best-effort
    }
  }, []);

  return {
    clientSecret,
    amount,
    currency,
    baseAmount,
    discountAmount,
    appliedOffer,
    validationMessage,
    isLoading,
    error,
    createPaymentIntent,
    cancelPaymentIntent,
  };
}
