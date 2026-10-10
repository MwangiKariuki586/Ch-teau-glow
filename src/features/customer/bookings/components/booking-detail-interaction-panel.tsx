"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookingStatus } from "@/lib/constants/booking-status";
import { Button } from "@/components/ui/button";
import { BookingActionDrawers, type BookingActionBooking } from "./booking-action-drawers";
import { BookingRescheduleRequestCard } from "./booking-reschedule-request-card";
import { BookingReviewSection } from "./booking-review-section";
import { AddToCalendarButton } from "./add-to-calendar-button";
import {
  canShowCalendarAction,
  canShowCancelAction,
} from "@/features/customer/bookings/lib/customer-booking-ui";

type BookingReviewRow = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

type PendingChangeRequest = {
  id: string;
  type: "reschedule";
  status: "pending" | "accepted" | "declined" | "countered" | "expired" | "cancelled";
  proposed_starts_at: string;
  proposed_ends_at: string;
  reason: string;
  requested_at: string;
  customer_response: "accepted" | "declined" | "proposed_new_time" | null;
  customer_message: string | null;
  customer_proposed_starts_at: string | null;
  customer_proposed_ends_at: string | null;
  responded_at: string | null;
};

export function BookingDetailInteractionPanel(props: {
  booking: BookingActionBooking;
  bookingStatus: BookingStatus;
  initialReview: BookingReviewRow | null;
  pendingChangeRequest: PendingChangeRequest | null;
  initialAction: "cancel" | "reschedule" | null;
}) {
  const { booking, bookingStatus, initialReview, pendingChangeRequest, initialAction } = props;
  const router = useRouter();
  const [currentRequest, setCurrentRequest] = useState(pendingChangeRequest);
  const [requestedAction, setRequestedAction] = useState<"cancel" | "reschedule" | null>(
    initialAction === "cancel" ? "cancel" : null,
  );
  const [policyState, setPolicyState] = useState({
    cancelAllowed: false,
    rescheduleAllowed: false,
    loading: true,
  });
  const activeRequest = currentRequest && (currentRequest.status === "pending" || currentRequest.status === "countered");
  const canCancelByStatus = canShowCancelAction({
    status: bookingStatus,
    hasPendingChangeRequest: Boolean(activeRequest),
  });
  const canCancel = !activeRequest && !policyState.loading && canCancelByStatus && policyState.cancelAllowed;
  const canAddCalendar = !activeRequest && canShowCalendarAction(bookingStatus);
  const serviceHref = booking.serviceSlug ? `/services/${booking.serviceSlug}` : "/services";

  const nextStepsCard = activeRequest ? (
    <BookingRescheduleRequestCard
      booking={{
        id: booking.id,
        serviceId: booking.serviceId,
        specialistId: booking.specialistId,
        status: bookingStatus,
      }}
      request={currentRequest}
      autoFocus={initialAction === "reschedule"}
      onResolved={() => {
        setCurrentRequest(null);
        router.refresh();
      }}
      onRequestCancel={() => setRequestedAction("cancel")}
    />
  ) : bookingStatus === "pending" ? (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B4423]/70">
        Next steps
      </p>
      <h2 className="mt-2 text-xl font-semibold">Awaiting confirmation</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;ll notify you once your booking is approved.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={serviceHref}>View service</Link>
        </Button>
        {!policyState.loading && policyState.rescheduleAllowed ? (
          <Button variant="outline" onClick={() => setRequestedAction("reschedule")}>
            Reschedule
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="outline" onClick={() => setRequestedAction("cancel")}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  ) : bookingStatus === "confirmed" ? (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B4423]/70">
        Next steps
      </p>
      <h2 className="mt-2 text-xl font-semibold">You&apos;re booked</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {format(new Date(booking.startsAt), "EEE, MMM d, yyyy")} ·{" "}
        {format(new Date(booking.startsAt), "h:mm a")} - {format(new Date(booking.endsAt), "h:mm a")} at {booking.venueName}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {canAddCalendar ? <AddToCalendarButton bookingId={booking.id} variant="default" size="default" /> : null}
        {!policyState.loading && policyState.rescheduleAllowed ? (
          <Button variant="outline" onClick={() => setRequestedAction("reschedule")}>
            Reschedule
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="outline" onClick={() => setRequestedAction("cancel")}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  ) : bookingStatus === "rescheduled" ? (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B4423]/70">
        Next steps
      </p>
      <h2 className="mt-2 text-xl font-semibold">Booking updated</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your appointment is set for {format(new Date(booking.startsAt), "EEE, MMM d, yyyy")} ·{" "}
        {format(new Date(booking.startsAt), "h:mm a")} - {format(new Date(booking.endsAt), "h:mm a")}.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {canAddCalendar ? <AddToCalendarButton bookingId={booking.id} variant="default" size="default" /> : null}
        {canCancel ? (
          <Button variant="outline" onClick={() => setRequestedAction("cancel")}>
            Cancel
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={serviceHref}>View service</Link>
        </Button>
      </div>
    </div>
  ) : bookingStatus === "completed" ? (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B4423]/70">
        Next steps
      </p>
      <h2 className="mt-2 text-xl font-semibold">Completed</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your appointment is complete. Review aftercare guidance or leave feedback.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="default">
          <Link href={`/bookings/${booking.id}/aftercare`}>Aftercare</Link>
        </Button>
        <BookingReviewSection
          bookingId={booking.id}
          bookingStatus={bookingStatus}
          initialReview={initialReview}
          inlinePrompt={false}
          triggerLabel="Rate & review"
        />
        <Button asChild variant="outline">
          <Link href={serviceHref}>Rebook</Link>
        </Button>
      </div>
      {initialReview ? (
        <div className="mt-4">
          <BookingReviewSection
            bookingId={booking.id}
            bookingStatus={bookingStatus}
            initialReview={initialReview}
          />
        </div>
      ) : null}
    </div>
  ) : bookingStatus === "cancelled" || bookingStatus === "rejected" ? (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B4423]/70">
        Next steps
      </p>
      <h2 className="mt-2 text-xl font-semibold">
        {bookingStatus === "rejected" ? "Booking not approved" : "Booking cancelled"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {bookingStatus === "rejected"
          ? "Review the reason below, then choose another service time if needed."
          : "This appointment will no longer take place."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="default">
          <Link href={serviceHref}>Rebook</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={serviceHref}>View service</Link>
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {nextStepsCard}

      {!activeRequest && bookingStatus !== "completed" ? (
        <BookingReviewSection
          bookingId={booking.id}
          bookingStatus={bookingStatus}
          initialReview={initialReview}
        />
      ) : null}

      <BookingActionDrawers
        booking={booking}
        requestedAction={requestedAction}
        onRequestedActionHandled={() => setRequestedAction(null)}
        hideInlineActions
        onPolicyResolved={setPolicyState}
        onBookingUpdated={() => {
          setCurrentRequest(null);
          router.refresh();
        }}
      />
    </div>
  );
}
