"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar, MapPin, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingActionDrawers } from "./booking-action-drawers";
import { AddToCalendarButton } from "./add-to-calendar-button";
import type { CustomerBookingItem } from "./customer-bookings";
import {
  canShowCalendarAction,
  canShowCancelAction,
  getCustomerBookingNextStepText,
  getCustomerBookingStatusBadge,
  getCustomerBookingUiState,
} from "@/features/customer/bookings/lib/customer-booking-ui";

const statusClassMap: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  rescheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
  no_show: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

const actionRequiredBadgeClassName =
  "bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300";

export function CustomerBookingCard(props: {
  booking: CustomerBookingItem;
  onBookingUpdated: (updated: {
    id: string;
    status: CustomerBookingItem["status"];
    starts_at: string;
    ends_at: string;
    notes: string | null;
  }) => void;
}) {
  const { booking, onBookingUpdated } = props;
  const [requestedAction, setRequestedAction] = useState<"cancel" | "reschedule" | null>(null);
  const [policyState, setPolicyState] = useState({
    cancelAllowed: false,
    rescheduleAllowed: false,
    loading: true,
  });

  const uiState = useMemo(
    () =>
      getCustomerBookingUiState({
        status: booking.status,
        hasPendingChangeRequest: booking.hasPendingChangeRequest,
      }),
    [booking.hasPendingChangeRequest, booking.status],
  );

  const detailHref = `/customer/bookings/${booking.id}`;
  const statusLabel = getCustomerBookingStatusBadge({
    status: booking.status,
    hasPendingChangeRequest: booking.hasPendingChangeRequest,
  });
  const nextStepText = getCustomerBookingNextStepText(uiState);
  const canCancelByState = canShowCancelAction({
    status: booking.status,
    hasPendingChangeRequest: booking.hasPendingChangeRequest,
  });
  const showCancel =
    !booking.hasPendingChangeRequest &&
    !policyState.loading &&
    canCancelByState &&
    policyState.cancelAllowed;
  const showCalendar = !booking.hasPendingChangeRequest && canShowCalendarAction(booking.status);
  const showReschedule =
    !booking.hasPendingChangeRequest &&
    !policyState.loading &&
    policyState.rescheduleAllowed;
  const isPackageBooking = booking.bookingKind === "package";

  useEffect(() => {
    if (booking.hasPendingChangeRequest) {
      setPolicyState({
        cancelAllowed: false,
        rescheduleAllowed: false,
        loading: false,
      });
    }
  }, [booking.hasPendingChangeRequest]);

  return (
    <Card
      className={[
        "border-border/50 shadow-sm transition hover:shadow-md",
        booking.hasPendingChangeRequest ? "border-[#6B4423]/25 bg-[#FFF8F0]" : "",
      ].join(" ")}
    >
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{booking.bookingTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {isPackageBooking
                ? `Intake service: ${booking.serviceName}`
                : booking.venueName}
            </p>
            {isPackageBooking ? (
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B4423]/70">
                Package booking
              </p>
            ) : null}
          </div>
          <Badge
            className={
              booking.hasPendingChangeRequest
                ? actionRequiredBadgeClassName
                : (statusClassMap[booking.status] ?? "")
            }
          >
            {statusLabel}
          </Badge>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(booking.startsAt), "EEE, MMM d, yyyy")} ·{" "}
              {format(new Date(booking.startsAt), "h:mm a")} -{" "}
              {format(new Date(booking.endsAt), "h:mm a")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{booking.venueName}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            <span>{booking.specialistName}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B4423]/70">
            Next steps
          </p>
          <p className="mt-2 text-sm text-foreground">{nextStepText}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild className="bg-[#6B4423] text-white hover:bg-[#52341f]">
            <Link href={detailHref}>
              {booking.hasPendingChangeRequest ? "Review & respond" : "View details"}
            </Link>
          </Button>

          {showReschedule ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRequestedAction("reschedule")}
            >
              Reschedule
            </Button>
          ) : null}

          {showCalendar ? <AddToCalendarButton bookingId={booking.id} /> : null}

          {showCancel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRequestedAction("cancel")}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <div className="hidden">
          <BookingActionDrawers
            booking={{
              id: booking.id,
              status: booking.status,
              startsAt: booking.startsAt,
              endsAt: booking.endsAt,
              serviceId: booking.serviceId,
              serviceSlug: booking.serviceSlug,
              branchId: booking.branchId,
              specialistId: booking.specialistId,
              serviceName: isPackageBooking
                ? `${booking.bookingTitle} · Intake service: ${booking.serviceName}`
                : booking.serviceName,
              venueName: booking.venueName,
              specialistName: booking.specialistName,
            }}
            requestedAction={requestedAction}
            onRequestedActionHandled={() => setRequestedAction(null)}
            hideInlineActions
            onPolicyResolved={setPolicyState}
            onBookingUpdated={onBookingUpdated}
          />
        </div>
      </CardContent>
    </Card>
  );
}
