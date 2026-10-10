"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaymentStatusBadge, formatPaymentAmount } from "@/features/shared/payment";
import type {
  AdminBookingDetailsResponse,
  AdminBookingRow,
} from "../lib/types";
import {
  canApprove,
  canComplete,
  canReject,
  canReschedule,
  fetchJson,
  formatBookingChannelMeta,
  formatDateTime,
  formatTimeRange,
  normalizeBookingChannel,
  toSingle,
  toUserMessage,
} from "../lib/utils";
import { ChannelBadge } from "./channel-badge";
import { StatusBadge } from "./status-badge";

export function BookingDetailPanel(props: {
  bookingId: string | null;
  sourceBooking: AdminBookingRow | null;
  reloadKey: number;
  onApprove: (booking: AdminBookingRow) => Promise<void>;
  onReject: (booking: AdminBookingRow) => void;
  onReschedule: (booking: AdminBookingRow) => void;
  onComplete: (booking: AdminBookingRow) => Promise<void>;
  actionBusyKey: string | null;
}) {
  const {
    bookingId,
    sourceBooking,
    reloadKey,
    onApprove,
    onReject,
    onReschedule,
    onComplete,
    actionBusyKey,
  } = props;

  const [details, setDetails] = useState<AdminBookingDetailsResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setDetails(null);
      setError(null);
      return;
    }

    setDetails(null);
    setError(null);

    const controller = new AbortController();

    fetchJson<AdminBookingDetailsResponse>(`/api/admin/bookings/${bookingId}`, {
      signal: controller.signal,
    })
      .then((response) => setDetails(response.data))
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          fetchError instanceof Error
            ? toUserMessage(fetchError.message, "Booking details could not be loaded.")
            : "Booking details could not be loaded.";
        setError(message);
      });

    return () => controller.abort();
  }, [bookingId, reloadKey]);

  if (!bookingId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CalendarClock className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-base font-medium text-foreground">Select a booking</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Click any booking from the list to view its full details, history, and available actions.
        </p>
      </div>
    );
  }

  const booking = details?.booking;
  const customer = details?.customer;
  const auditTrail = details?.audit_trail ?? [];
  const rescheduleHistory = details?.reschedule_history ?? [];
  const changeRequests = details?.change_requests ?? [];
  const loading = Boolean(bookingId && !details && !error);

  const resolvedSource =
    sourceBooking ??
    (booking && customer
      ? {
          id: booking.id,
          booking_kind: booking.booking_kind,
          package_id: booking.package_id,
          package: toSingle(booking.package)
            ? {
                id: toSingle(booking.package)?.id ?? "",
                name: toSingle(booking.package)?.name ?? "Package",
                slug: toSingle(booking.package)?.slug ?? "",
              }
            : null,
          status: booking.status,
          booking_channel: booking.booking_channel,
          starts_at: booking.starts_at,
          ends_at: booking.ends_at,
          notes: booking.notes,
          created_at: booking.created_at ?? booking.starts_at,
          duration_minutes: 0,
          starts_in_seconds: 0,
          pending_age_seconds: 0,
          requires_attention: false,
          attention_reasons: [],
          attention_priority: 0,
          payment_status: booking.payment_status ?? "pending",
          payment_amount_cents: booking.payment_amount_cents ?? null,
          payment_currency: booking.payment_currency ?? null,
          customer,
          service: {
            id: toSingle(booking.service)?.id ?? "",
            name: toSingle(booking.service)?.name ?? "Service",
            slug: toSingle(booking.service)?.slug ?? "",
            min_price_cents: 0,
            max_price_cents: 0,
            currency: "AED",
            duration_minutes: 0,
          },
          branch: {
            id: toSingle(booking.branch)?.id ?? "",
            name: toSingle(booking.branch)?.name ?? "Branch",
            city: toSingle(booking.branch)?.city ?? null,
            country: toSingle(booking.branch)?.country ?? null,
            address: toSingle(booking.branch)?.address ?? null,
          },
          specialist: {
            id: toSingle(booking.specialist)?.id ?? "",
            name: toSingle(booking.specialist)?.name ?? "Specialist",
            title: toSingle(booking.specialist)?.title ?? null,
          },
        }
      : null);

  const bookingChannel = normalizeBookingChannel(
    booking?.booking_channel ?? resolvedSource?.booking_channel,
  );
  const packageName =
    toSingle(booking?.package)?.name ?? resolvedSource?.package?.name ?? null;
  const channelMetaEntries = formatBookingChannelMeta(booking?.booking_channel_meta);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {booking?.booking_kind === "package" || resolvedSource?.booking_kind === "package"
              ? "Package Booking"
              : "Appointment Details"}
          </h2>
          {booking?.id && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ref: #{booking.id.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>
        {booking && <StatusBadge status={booking.status} />}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="h-full flex-1 min-h-0">
        {loading ? (
          <div className="p-6">
            <LoadingScreen
              compact
              title="Loading booking"
              description="Pulling customer context and action history."
            />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          </div>
        ) : details ? (
          <div className="space-y-4 p-6">
            {/* Core info */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
                  <p className="mt-1 font-medium text-foreground">{customer?.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{customer?.email ?? "No email on file"}</p>
                  <p className="text-sm text-muted-foreground">{customer?.phone ?? "No phone on file"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Schedule</p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatDateTime(booking?.starts_at ?? "")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTimeRange(booking?.starts_at ?? "", booking?.ends_at ?? "")}
                  </p>
                </div>
                {booking?.payment_status && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment</p>
                    <div className="mt-2 flex items-center gap-2">
                      <PaymentStatusBadge status={booking.payment_status} />
                    </div>
                    <p className="mt-1 font-medium text-foreground">
                      {formatPaymentAmount(booking.payment_amount_cents, booking.payment_currency)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
                  <div className="mt-2">
                    <ChannelBadge channel={bookingChannel} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {packageName ? "Package" : "Service"}
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {packageName ?? toSingle(booking?.service)?.name ?? "—"}
                  </p>
                  {packageName && (
                    <p className="text-sm text-muted-foreground">
                      Intake: {toSingle(booking?.service)?.name}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Practitioner</p>
                  <p className="mt-1 font-medium text-foreground">
                    {toSingle(booking?.specialist)?.name ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {toSingle(booking?.specialist)?.title ?? "Title unavailable"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Branch</p>
                  <p className="mt-1 font-medium text-foreground">
                    {toSingle(booking?.branch)?.name ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      toSingle(booking?.branch)?.city,
                      toSingle(booking?.branch)?.country,
                      toSingle(booking?.branch)?.address,
                    ]
                      .filter(Boolean)
                      .join(" | ") || "Branch details unavailable"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {booking?.notes?.trim() || "No notes on this booking."}
                  </p>
                </div>
                {booking?.rejection_reason?.trim() && (
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Rejection reason
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {booking.rejection_reason.trim()}
                    </p>
                  </div>
                )}
                {channelMetaEntries.length > 0 && (
                  <div className="sm:col-span-2">
                    <details className="rounded-2xl border border-[#6B4423]/10 bg-[#FFF8F0] p-4">
                      <summary className="cursor-pointer list-none text-sm font-medium text-[#6B4423]">
                        Source details
                      </summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {channelMetaEntries.map((entry) => (
                          <div key={entry.key}>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              {entry.label}
                            </p>
                            <p className="mt-1 text-sm text-foreground">{entry.value}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>

            {/* Change requests */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Change requests</h3>
              <div className="space-y-3">
                {changeRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No change requests on this booking.</p>
                ) : (
                  changeRequests.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium capitalize text-foreground">{item.type} request</p>
                        <StatusBadge
                          status={
                            item.status === "cancelled"
                              ? "cancelled"
                              : item.status === "expired"
                                ? "rejected"
                                : item.status === "accepted"
                                  ? "confirmed"
                                  : item.status === "declined"
                                    ? "rejected"
                                    : "rescheduled"
                          }
                        />
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {formatDateTime(item.proposed_starts_at)} → {formatDateTime(item.proposed_ends_at)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                      {item.customer_response && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Customer:{" "}
                          <span className="font-medium text-foreground">
                            {item.customer_response.replace(/_/g, " ")}
                          </span>
                        </p>
                      )}
                      {item.customer_message?.trim() && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Message: {item.customer_message.trim()}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Requested {formatDateTime(item.requested_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reschedule history */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Reschedule history</h3>
              <div className="space-y-3">
                {rescheduleHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reschedule history on this booking.</p>
                ) : (
                  rescheduleHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border/70 p-3">
                      <p className="text-sm font-medium text-foreground">
                        {formatDateTime(item.old_starts_at)} → {formatDateTime(item.new_starts_at)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.reason?.trim() || "No reason recorded."}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Changed {formatDateTime(item.changed_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audit trail */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Audit trail</h3>
              <div className="space-y-3">
                {auditTrail.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No admin actions recorded yet.</p>
                ) : (
                  auditTrail.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium capitalize text-foreground">{item.action_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.decision_reason?.trim() || "No decision note provided."}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </ScrollArea>

      {/* Action footer */}
      {resolvedSource && (
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {canApprove(resolvedSource.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onApprove(resolvedSource)}
                disabled={actionBusyKey === `approve:${resolvedSource.id}`}
              >
                {actionBusyKey === `approve:${resolvedSource.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve
              </Button>
            )}
            {canReschedule(resolvedSource.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReschedule(resolvedSource)}
              >
                <CalendarClock className="h-4 w-4" />
                Reschedule
              </Button>
            )}
            {canReject(resolvedSource.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(resolvedSource)}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            )}
            {canComplete(resolvedSource.status) && (
              <Button
                size="sm"
                className="bg-[#3E2723] text-white hover:bg-[#52342d]"
                onClick={() => void onComplete(resolvedSource)}
                disabled={actionBusyKey === `complete:${resolvedSource.id}`}
              >
                {actionBusyKey === `complete:${resolvedSource.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Mark complete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
