"use client";

import { format } from "date-fns";
import { Loader2, RefreshCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilitySlotPicker } from "@/features/shared/booking/components/availability-slot-picker";
import type { BookingStatus } from "@/lib/constants/booking-status";

type PolicyPreview = {
  allowed: boolean;
  reason: string;
  decision_reason?: string;
  flags?: {
    late_cancel?: boolean;
    requires_override_reason?: boolean;
    max_reschedules_reached?: boolean;
  };
  window?: {
    free_cancel_until?: string;
    cancel_cutoff_at?: string;
    reschedule_cutoff_at?: string;
  };
};

type BookingMutationResult = {
  id: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  notes: string | null;
};

type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
};

type PolicyGateResponse = {
  cancel?: PolicyPreview;
  reschedule?: PolicyPreview;
  error?: string;
  decision_reason?: string;
};

export type BookingActionBooking = {
  id: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  serviceId: string;
  serviceSlug?: string | null;
  branchId: string;
  specialistId: string;
  serviceName: string;
  venueName: string;
  specialistName: string;
};

type BookingActionDrawersProps = {
  booking: BookingActionBooking;
  onBookingUpdated?: (booking: BookingMutationResult) => void;
  requestedAction?: "cancel" | "reschedule" | null;
  onRequestedActionHandled?: () => void;
  hideInlineActions?: boolean;
  onPolicyResolved?: (policy: {
    cancelAllowed: boolean;
    rescheduleAllowed: boolean;
    loading: boolean;
  }) => void;
};

const cancelReasonOptions = [
  { value: "plans_changed", label: "Plans changed" },
  { value: "selected_wrong_time", label: "Wrong time selected" },
  { value: "booking_by_mistake", label: "Booked by mistake" },
  { value: "other", label: "Other" },
];

function toReadableReason(value: string | null) {
  if (!value) return undefined;
  return value.replace(/_/g, " ");
}

function formatDateTime(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "PPP p");
}

function getTimezoneOffsetMinutesForDate(dateKey: string) {
  const localMidday = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(localMidday.getTime())) {
    return new Date().getTimezoneOffset();
  }
  return localMidday.getTimezoneOffset();
}

async function readResponseJson<T extends Record<string, unknown>>(response: Response) {
  const raw = await response.text();
  if (!raw.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid API response (${response.status}).`);
  }
}

export function BookingActionDrawers({
  booking,
  onBookingUpdated,
  requestedAction,
  onRequestedActionHandled,
  hideInlineActions = false,
  onPolicyResolved,
}: BookingActionDrawersProps) {
  const router = useRouter();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const [cancelPolicy, setCancelPolicy] = useState<PolicyPreview | null>(null);
  const [reschedulePolicy, setReschedulePolicy] = useState<PolicyPreview | null>(null);
  const [loadingCancelPolicy, setLoadingCancelPolicy] = useState(false);
  const [loadingReschedulePolicy, setLoadingReschedulePolicy] = useState(false);

  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelOtherReason, setCancelOtherReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingPolicyGate, setLoadingPolicyGate] = useState(true);

  const terminalStatus = ["cancelled", "rejected", "completed", "no_show"].includes(booking.status);

  useEffect(() => {
    if (!requestedAction) return;

    if (requestedAction === "cancel") {
      setCancelOpen(true);
      onRequestedActionHandled?.();
      return;
    }

    if (requestedAction === "reschedule") {
      setRescheduleOpen(true);
      onRequestedActionHandled?.();
    }
  }, [onRequestedActionHandled, requestedAction]);

  useEffect(() => {
    onPolicyResolved?.({
      cancelAllowed: Boolean(cancelPolicy?.allowed),
      rescheduleAllowed: Boolean(reschedulePolicy?.allowed),
      loading: loadingPolicyGate,
    });
  }, [
    cancelPolicy?.allowed,
    loadingPolicyGate,
    onPolicyResolved,
    reschedulePolicy?.allowed,
  ]);

  useEffect(() => {
    if (terminalStatus) {
      setLoadingPolicyGate(false);
      setCancelPolicy({
        allowed: false,
        reason: "This booking is in a terminal state.",
      });
      setReschedulePolicy({
        allowed: false,
        reason: "This booking is in a terminal state.",
      });
      return;
    }

    let mounted = true;

    const loadPolicyGate = async () => {
      setLoadingPolicyGate(true);

      try {
        const response = await fetch(`/api/bookings/${booking.id}/policy?action=all`, {
          cache: "no-store",
        });
        const result = await readResponseJson<PolicyGateResponse>(response);

        if (!response.ok) {
          throw new Error(
            result.decision_reason ??
              result.error ??
              "Failed to evaluate booking actions.",
          );
        }

        if (!mounted) return;
        setCancelPolicy(result.cancel ?? { allowed: false, reason: "Cancellation unavailable." });
        setReschedulePolicy(
          result.reschedule ?? { allowed: false, reason: "Reschedule unavailable." },
        );
      } catch {
        if (!mounted) return;
        const message =
          "Failed to evaluate booking actions.";
        setCancelPolicy({ allowed: false, reason: message });
        setReschedulePolicy({ allowed: false, reason: message });
      } finally {
        if (mounted) {
          setLoadingPolicyGate(false);
        }
      }
    };

    void loadPolicyGate();

    return () => {
      mounted = false;
    };
  }, [booking.id, terminalStatus]);

  useEffect(() => {
    if (!cancelOpen) return;

    let mounted = true;

    const loadPolicy = async () => {
      setLoadingCancelPolicy(true);
      try {
        const response = await fetch(`/api/bookings/${booking.id}/policy?action=cancel`, {
          cache: "no-store",
        });
        const result = await readResponseJson<PolicyPreview & { error?: string }>(response);

        if (!response.ok) {
          throw new Error(
            result.decision_reason ??
              result.error ??
              result.reason ??
              "Failed to evaluate policy.",
          );
        }

        if (!mounted) return;
        setCancelPolicy(result);
      } catch (error) {
        if (!mounted) return;
        toast.error(error instanceof Error ? error.message : "Failed to evaluate policy.");
      } finally {
        if (mounted) {
          setLoadingCancelPolicy(false);
        }
      }
    };

    void loadPolicy();

    return () => {
      mounted = false;
    };
  }, [booking.id, cancelOpen]);

  useEffect(() => {
    if (!rescheduleOpen) return;

    let mounted = true;

    const loadPolicy = async () => {
      setLoadingReschedulePolicy(true);
      try {
        const response = await fetch(`/api/bookings/${booking.id}/policy?action=reschedule`, {
          cache: "no-store",
        });
        const result = await readResponseJson<PolicyPreview & { error?: string }>(response);

        if (!response.ok) {
          throw new Error(
            result.decision_reason ??
              result.error ??
              result.reason ??
              "Failed to evaluate policy.",
          );
        }

        if (!mounted) return;
        setReschedulePolicy(result);
      } catch {
        if (!mounted) return;
        toast.error("We couldn't check reschedule rules right now. Please try again.");
      } finally {
        if (mounted) {
          setLoadingReschedulePolicy(false);
        }
      }
    };

    void loadPolicy();

    return () => {
      mounted = false;
    };
  }, [booking.id, rescheduleOpen]);

  useEffect(() => {
    if (!rescheduleOpen) return;
    const currentBookingDate = new Date(booking.startsAt);
    setSelectedDate(
      Number.isNaN(currentBookingDate.getTime())
        ? format(new Date(), "yyyy-MM-dd")
        : format(currentBookingDate, "yyyy-MM-dd"),
    );
    setSelectedSlot(null);
    setSlots([]);
    setRescheduleReason("");
  }, [booking.startsAt, rescheduleOpen]);

  useEffect(() => {
    if (!rescheduleOpen || !selectedDate) return;
    if (!reschedulePolicy?.allowed) return;

    let mounted = true;

    const loadAvailability = async () => {
      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/availability?service_id=${booking.serviceId}&specialist_id=${booking.specialistId}&date=${selectedDate}&tz_offset_minutes=${getTimezoneOffsetMinutesForDate(selectedDate)}`,
          { cache: "no-store" },
        );
        const result = await readResponseJson<{ data?: AvailabilitySlot[]; error?: string }>(
          response,
        );

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load availability.");
        }

        if (!mounted) return;
        const nextSlots = result.data ?? [];
        setSlots(nextSlots);
        setSelectedSlot((current) =>
          current && nextSlots.some((slot) => slot.starts_at === current.starts_at)
            ? current
            : null,
        );
      } catch {
        if (!mounted) return;
        toast.error("We couldn't load availability right now. Please try again.");
      } finally {
        if (mounted) {
          setLoadingSlots(false);
        }
      }
    };

    void loadAvailability();

    return () => {
      mounted = false;
    };
  }, [
    booking.serviceId,
    booking.specialistId,
    rescheduleOpen,
    reschedulePolicy?.allowed,
    selectedDate,
  ]);

  const handleCancel = async () => {
    if (!cancelPolicy?.allowed) return;

    if (cancelReason === "other" && !cancelOtherReason.trim()) {
      toast.error("Please provide a specific cancellation reason.");
      return;
    }

    const normalizedReason =
      cancelReason === "other"
        ? cancelOtherReason.trim()
        : (toReadableReason(cancelReason) ?? undefined);

    setCancelSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: normalizedReason,
        }),
      });

      const result = await readResponseJson<{
        data?: { booking?: BookingMutationResult };
        error?: string;
        decision_reason?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(result.decision_reason ?? result.error ?? "Failed to cancel booking.");
      }

      const updated = result.data?.booking;
      if (updated) {
        onBookingUpdated?.(updated);
      }

      toast.success("Booking cancelled.");
      setCancelOpen(false);
      setCancelReason("");
      setCancelOtherReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel booking.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!reschedulePolicy?.allowed || !selectedSlot) return;

    const requiresReason = Boolean(reschedulePolicy.flags?.requires_override_reason);
    if (requiresReason && !rescheduleReason.trim()) {
      toast.error("Override reason is required.");
      return;
    }

    setRescheduleSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_starts_at: selectedSlot.starts_at,
          new_ends_at: selectedSlot.ends_at,
          reason: rescheduleReason.trim() || undefined,
        }),
      });

      const result = await readResponseJson<{
        data?: { booking?: BookingMutationResult };
        error?: string;
        decision_reason?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(result.decision_reason ?? result.error ?? "Failed to reschedule booking.");
      }

      const updated = result.data?.booking;
      if (updated) {
        onBookingUpdated?.(updated);
      }

      toast.success("Booking rescheduled.");
      setRescheduleOpen(false);
      setRescheduleReason("");
      setSelectedSlot(null);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't reschedule this booking right now.";
      toast.error(message);
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const showRescheduleAction = !loadingPolicyGate && Boolean(reschedulePolicy?.allowed);
  const showCancelAction = !loadingPolicyGate && Boolean(cancelPolicy?.allowed);
  const cancelButtonClassName =
    "border-primary text-primary hover:bg-primary/10 hover:text-primary";

  return (
    <div className="flex flex-wrap gap-2">
      {loadingPolicyGate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking actions...
        </div>
      )}

      {showRescheduleAction && (
        <Sheet
          open={rescheduleOpen}
          onOpenChange={(open) => {
            setRescheduleOpen(open);
            if (!open) {
              setRescheduleReason("");
              setSlots([]);
              setSelectedSlot(null);
            }
          }}
        >
          {!hideInlineActions ? (
            <SheetTrigger asChild>
              <Button size="sm">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reschedule
              </Button>
            </SheetTrigger>
          ) : null}
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Reschedule booking</SheetTitle>
              <SheetDescription>
                Select a new date/time while keeping your current service, branch, and specialist.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-2">
              {loadingReschedulePolicy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking policy...
                </div>
              )}

              <AvailabilitySlotPicker
                selectedDate={selectedDate}
                onDateChange={(dateKey) => {
                  setSelectedDate(dateKey);
                  setSelectedSlot(null);
                }}
                selectedSlot={selectedSlot}
                onSlotChange={setSelectedSlot}
                slots={slots}
                loadingSlots={loadingSlots}
                disabled={!reschedulePolicy?.allowed}
                emptyStateText="No slots available for this date."
                loadingText="Loading slots..."
              />

              <div className="space-y-2">
                <Label htmlFor={`reschedule-reason-${booking.id}`}>Reason (optional)</Label>
                <Textarea
                  id={`reschedule-reason-${booking.id}`}
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  placeholder="Why are you rescheduling?"
                />
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                onClick={handleReschedule}
                disabled={
                  !reschedulePolicy?.allowed ||
                  !selectedSlot ||
                  rescheduleSubmitting ||
                  (reschedulePolicy.flags?.requires_override_reason &&
                    !rescheduleReason.trim())
                }
              >
                {rescheduleSubmitting ? "Saving..." : "Confirm reschedule"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {showCancelAction && (
        <Sheet
          open={cancelOpen}
          onOpenChange={(open) => {
            setCancelOpen(open);
            if (!open) {
              setCancelReason("");
              setCancelOtherReason("");
            }
          }}
        >
          {!hideInlineActions ? (
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className={cancelButtonClassName}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </SheetTrigger>
          ) : null}
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Cancel booking</SheetTitle>
              <SheetDescription>
                Confirm cancellation for this appointment.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-2">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">{booking.serviceName}</p>
                <p className="text-muted-foreground">{booking.venueName}</p>
                <p className="text-muted-foreground">Specialist: {booking.specialistName}</p>
                <p className="text-muted-foreground">
                  Scheduled: {formatDateTime(booking.startsAt)} - {formatDateTime(booking.endsAt)}
                </p>
              </div>

              {loadingCancelPolicy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking policy...
                </div>
              )}

              {cancelPolicy?.flags?.late_cancel && (
                <p className="text-sm text-muted-foreground">
                  You are within the late cancellation window for this booking.
                </p>
              )}

              {cancelPolicy?.flags?.requires_override_reason && (
                <p className="text-sm text-muted-foreground">
                  A reason is required for this cancellation.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor={`cancel-reason-${booking.id}`}>Reason</Label>
                <Select
                  value={cancelReason}
                  onValueChange={(value) => {
                    setCancelReason(value);
                    if (value !== "other") {
                      setCancelOtherReason("");
                    }
                  }}
                >
                  <SelectTrigger id={`cancel-reason-${booking.id}`} className="w-full">
                    <SelectValue placeholder="Optional reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {cancelReasonOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {cancelReason === "other" && (
                <div className="space-y-2">
                  <Label htmlFor={`cancel-other-reason-${booking.id}`}>Specific reason</Label>
                  <Textarea
                    id={`cancel-other-reason-${booking.id}`}
                    value={cancelOtherReason}
                    onChange={(event) => setCancelOtherReason(event.target.value)}
                    placeholder="Please provide details"
                  />
                </div>
              )}
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                className={cancelButtonClassName}
                onClick={handleCancel}
                disabled={
                  !cancelPolicy?.allowed ||
                  cancelSubmitting ||
                  (cancelReason === "other" && !cancelOtherReason.trim()) ||
                  (cancelPolicy?.flags?.requires_override_reason && !cancelReason)
                }
              >
                {cancelSubmitting ? "Cancelling..." : "Cancel booking"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* {showNoActionsMessage && (
        <p className="text-xs text-muted-foreground">
          {policyGateError
            ? "Actions unavailable right now."
            : "No booking actions available under current policy."}
        </p>
      )} */}
    </div>
  );
}
