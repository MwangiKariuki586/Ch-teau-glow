/**
 * PaymentStep component
 * Main container for the payment step in booking flow
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingSummary } from "./BookingSummary";
import { PaymentForm } from "./PaymentForm";
import { usePaymentIntent } from "../hooks/usePaymentIntent";
import type { PaymentStepProps } from "../types";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

export function PaymentStep({
  service,
  branch,
  specialist,
  selectedSlot,
  packageId,
  offerId,
  code,
  waitlistOfferId,
  waitlistOfferGroupId,
  waitlistNotificationId,
  packageSummary,
  onPaymentSuccess,
}: PaymentStepProps) {
  const router = useRouter();
  const isPackageBooking = Boolean(packageSummary && packageId);
  const {
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
  } = usePaymentIntent();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  useEffect(() => {
    if (!error) return;

    toast.error(
      error.includes("network") || error.includes("connect")
        ? "We're having trouble connecting to the payment service. Please check your internet connection."
        : error.includes("authentication") || error.includes("configuration")
          ? "Payment system is temporarily unavailable. Please try again later or contact support."
          : error,
    );
  }, [error]);

  useEffect(() => {
    createPaymentIntent({
      service_id: service.id,
      branch_id: branch.id,
      specialist_id: specialist.id,
      starts_at: selectedSlot.starts_at,
      package_id: packageId ?? undefined,
      offer_id: offerId ?? undefined,
      code: code ?? undefined,
    });

    // Cancel payment intent on unmount (when navigating away)
    return () => {
      cancelPaymentIntent();
    };
  }, [
    branch.id,
    cancelPaymentIntent,
    createPaymentIntent,
    selectedSlot.starts_at,
    service.id,
    specialist.id,
    packageId,
    offerId,
    code,
  ]);

  const handleRetryPaymentIntent = () => {
    createPaymentIntent({
      service_id: service.id,
      branch_id: branch.id,
      specialist_id: specialist.id,
      starts_at: selectedSlot.starts_at,
      package_id: packageId ?? undefined,
      offer_id: offerId ?? undefined,
      code: code ?? undefined,
    });
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    console.log("=== handlePaymentSuccess called ===");
    console.log("Payment Intent ID from confirmation:", paymentIntentId);

    setIsCreatingBooking(true);
    setBookingError(null);

    try {
      const bookingPayload = {
        service_id: service.id,
        branch_id: branch.id,
        specialist_id: specialist.id,
        starts_at: selectedSlot.starts_at,
        package_id: packageId ?? undefined,
        waitlist_offer_id: waitlistOfferId ?? undefined,
        waitlist_offer_group_id: waitlistOfferGroupId ?? undefined,
        waitlist_notification_id: waitlistNotificationId ?? undefined,
        payment_intent_id: paymentIntentId,
      };

      console.log("Booking Payload:", bookingPayload);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      });

      console.log("Booking API Response Status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Booking API Error Response:", errorData);
        if (
          response.status === 409 &&
          typeof errorData.waitlist_redirect_url === "string"
        ) {
          toast.error(errorData.error || "That slot was just taken.");
          router.push(errorData.waitlist_redirect_url);
          return;
        }
        throw new Error(errorData.error || "Failed to create booking");
      }

      const { data } = await response.json();
      console.log("Booking Created Successfully:", data);
      toast.success(
        isPackageBooking
          ? "Package booking confirmed successfully!"
          : "Booking confirmed successfully!",
      );
      onPaymentSuccess(data.id);
    } catch (err) {
      let errorMessage = "Failed to create booking. Please try again.";

      if (err instanceof Error) {
        // Provide more specific error messages based on error type
        if (err.message.includes("network") || err.message.includes("fetch")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (err.message.includes("already exists")) {
          errorMessage =
            "This booking has already been created. Please check your bookings.";
        } else {
          errorMessage = err.message;
        }
      }

      setBookingError(errorMessage);
      toast.error(errorMessage);
      console.error("Booking creation error:", err);
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleRetryBooking = () => {
    setBookingError(null);
    if (clientSecret) {
      const paymentIntentId = clientSecret.split("_secret_")[0];
      handlePaymentSuccess(paymentIntentId);
    }
  };

  const handlePaymentError = (errorMsg: string) => {
    console.error("Payment error:", errorMsg);
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <div className="space-y-8">
          {/* Title */}
          <Skeleton className="h-8 w-56" />

          {/* Service */}
          <div className="flex items-start gap-4">
            <Skeleton className="mt-1 h-6 w-6 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>

          {/* Therapist */}
          <div className="flex items-start gap-4">
            <Skeleton className="mt-1 h-6 w-6 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-4">
            <Skeleton className="mt-1 h-6 w-6 rounded-full" />
            <div className="space-y-3 w-full">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-full max-w-[560px]" />
              <Skeleton className="h-5 w-full max-w-[500px]" />
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-8 w-72" />
          </div>

          {/* Time */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-8 w-28" />
          </div>

          {/* Divider */}
          <div className="border-t pt-8">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-10 w-56" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Unable to initialize payment. Please try again.
        </p>
        <Button
          onClick={handleRetryPaymentIntent}
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
    <div className="space-y-6">
      <BookingSummary
        service={service}
        branch={branch}
        specialist={specialist}
        selectedSlot={selectedSlot}
        amount={amount}
        currency={currency}
        baseAmount={baseAmount}
        discountAmount={discountAmount}
        packageSummary={packageSummary}
        appliedOffer={
          appliedOffer
            ? { title: appliedOffer.title, code: appliedOffer.code }
            : null
        }
        validationMessage={validationMessage}
      />

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
          },
        }}
      >
        <PaymentForm
          clientSecret={clientSecret}
          amount={amount}
          currency={currency}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          isCreatingBooking={isCreatingBooking}
        />
      </Elements>
    </div>
  );
}
