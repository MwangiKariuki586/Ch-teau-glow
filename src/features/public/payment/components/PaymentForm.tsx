/**
 * PaymentForm component
 * Renders Stripe payment form and handles submission
 */

"use client";

import { useState } from "react";
import {
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type {
  PaymentIntent,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
  StripeError,
} from "@stripe/stripe-js";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentFormProps } from "../types";

function toUserFacingError(error: StripeError) {
  if (error.type === "card_error") {
    if (error.code === "card_declined") {
      return (
        error.message ||
        "Your card was declined. Please try a different payment method."
      );
    }
    if (error.code === "insufficient_funds") {
      return "Insufficient funds. Please use a different payment method.";
    }
    if (error.code === "expired_card") {
      return "Your card has expired. Please use a different payment method.";
    }
    if (error.code === "incorrect_cvc") {
      return "Incorrect security code. Please check and try again.";
    }
    if (error.code === "processing_error") {
      return "An error occurred while processing your card. Please try again.";
    }

    return (
      error.message ||
      "Card payment failed. Please check your card details and try again."
    );
  }

  if (error.type === "validation_error") {
    return error.message || "Please check your payment details and try again.";
  }

  if (error.type === "api_error" || error.type === "api_connection_error") {
    return "Unable to connect to payment service. Please check your internet connection and try again.";
  }

  return (
    error.message || "An unexpected payment error occurred. Please try again."
  );
}

function handlePaymentIntentOutcome(params: {
  paymentIntent: PaymentIntent | undefined;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  setRetryCount: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { paymentIntent, onSuccess, onError, setRetryCount } = params;

  if (!paymentIntent) {
    const message = "Stripe did not return a payment result. Please try again.";
    toast.error(message);
    onError(message);
    return false;
  }

  if (paymentIntent.status === "succeeded") {
    setRetryCount(0);
    onSuccess(paymentIntent.id);
    return true;
  }

  if (paymentIntent.status === "processing") {
    const message =
      "Payment is being processed. Please wait a moment and try again.";
    toast.error(message);
    onError(message);
    return false;
  }

  if (paymentIntent.status === "requires_action") {
    const message =
      "Additional authentication is required. Please complete the wallet confirmation and try again.";
    toast.error(message);
    onError(message);
    return false;
  }

  const message = `Payment status: ${paymentIntent.status}. Please try again or contact support.`;
  toast.error(message);
  onError(message);
  return false;
}

export function PaymentForm({
  clientSecret,
  amount,
  currency,
  onSuccess,
  onError,
  isCreatingBooking = false,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasExpressCheckout, setHasExpressCheckout] = useState(false);
  const MAX_RETRIES = 3;

  const confirmPayment = async (
    expressEvent?: StripeExpressCheckoutElementConfirmEvent,
  ) => {
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        const message =
          submitResult.error.message || "Payment details are incomplete.";
        setErrorMessage(message);
        toast.error(message);
        expressEvent?.paymentFailed({ message, reason: "fail" });
        onError(message);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
      });

      console.log("=== Payment Confirmation Result ===");
      console.log("Error:", error);
      console.log("Payment Intent:", paymentIntent);
      console.log("Payment Intent Status:", paymentIntent?.status);
      console.log("===================================");

      if (error) {
        setRetryCount((prev) => prev + 1);
        const userMessage = toUserFacingError(error);
        setErrorMessage(userMessage);
        toast.error(userMessage);
        expressEvent?.paymentFailed({ message: userMessage, reason: "fail" });

        if (retryCount + 1 >= MAX_RETRIES) {
          toast.error(
            "Maximum payment attempts reached. Please contact support at support@example.com or call (555) 123-4567.",
            { duration: 10000 },
          );
        }

        onError(error.message || userMessage);
        return;
      }

      handlePaymentIntentOutcome({
        paymentIntent,
        onSuccess,
        onError,
        setRetryCount,
      });
    } catch (err) {
      setRetryCount((prev) => prev + 1);
      const message =
        err instanceof Error
          ? err.message
          : "Payment processing failed. Please check your internet connection and try again.";
      setErrorMessage(message);
      toast.error(message);
      expressEvent?.paymentFailed({ message, reason: "fail" });
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await confirmPayment();
  };

  const handleExpressConfirm = async (
    event: StripeExpressCheckoutElementConfirmEvent,
  ) => {
    await confirmPayment(event);
  };

  const handleExpressReady = (
    event: StripeExpressCheckoutElementReadyEvent,
  ) => {
    setHasExpressCheckout(Boolean(event.availablePaymentMethods));
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setRetryCount(0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Fast checkout
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Use Google Pay or another available wallet for the fastest
            confirmation path.
          </p>
        </div>
        <ExpressCheckoutElement
          onConfirm={handleExpressConfirm}
          onReady={handleExpressReady}
          options={{
            layout: {
              maxColumns: 1,
              maxRows: 2,
              overflow: "auto",
            },
          }}
        />
        {!hasExpressCheckout && (
          <p className="text-xs text-muted-foreground">
            No wallet buttons are currently available for this browser or
            device.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Other payment methods
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You can still pay using the standard Stripe payment form below.
          </p>
        </div>
        <PaymentElement />
      </div>

      <Button
        type="submit"
        disabled={
          !stripe ||
          isProcessing ||
          retryCount >= MAX_RETRIES ||
          isCreatingBooking
        }
        className="w-full"
        size="lg"
      >
        {isCreatingBooking ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Booking...
          </>
        ) : isProcessing ? (
          "Processing..."
        ) : retryCount >= MAX_RETRIES ? (
          "Maximum Attempts Reached"
        ) : (
          `Pay ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
          }).format(amount / 100)}`
        )}
      </Button>

      {retryCount > 0 && retryCount < MAX_RETRIES && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            Attempt {retryCount} of {MAX_RETRIES}
          </p>
          <Button type="button" variant="outline" onClick={handleRetry}>
            Reset payment state
          </Button>
        </div>
      )}
    </form>
  );
}
