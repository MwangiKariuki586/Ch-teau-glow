"use client";

import { format, isAfter, startOfDay } from "date-fns";
import { CheckCircle2, Loader2, RefreshCcw, XCircle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilitySlotPicker } from "@/features/shared/booking/components/availability-slot-picker";
import type {
  CompletionAftercareDraft,
  CompleteTarget,
  RejectTarget,
  RescheduleTarget,
} from "../lib/types";
import { formatDateTime } from "../lib/utils";

type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
};

type AvailabilityResponse = {
  data?: AvailabilitySlot[];
  error?: string;
};

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

export function BookingActionDialogs(props: {
  rejectTarget: RejectTarget;
  setRejectTarget: (value: RejectTarget) => void;
  handleRejectSubmit: (reason: string) => Promise<void>;
  rescheduleTarget: RescheduleTarget;
  setRescheduleTarget: (value: RescheduleTarget) => void;
  handleRescheduleSubmit: (params: {
    startsAt: string;
    endsAt: string;
    reason: string;
    tzOffsetMinutes: number;
  }) => Promise<void>;
  completeTarget: CompleteTarget;
  setCompleteTarget: (value: CompleteTarget) => void;
  completionAftercare: CompletionAftercareDraft;
  setCompletionAftercare: (
    value:
      | CompletionAftercareDraft
      | ((value: CompletionAftercareDraft) => CompletionAftercareDraft),
  ) => void;
  handleCompleteSubmit: () => Promise<void>;
  actionBusyKey: string | null;
}) {
  const {
    rejectTarget,
    setRejectTarget,
    handleRejectSubmit,
    rescheduleTarget,
    setRescheduleTarget,
    handleRescheduleSubmit,
    completeTarget,
    setCompleteTarget,
    completionAftercare,
    setCompletionAftercare,
    handleCompleteSubmit,
    actionBusyKey,
  } = props;

  const [rejectReason, setRejectReason] = React.useState("");
  const [rescheduleReason, setRescheduleReason] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState("");
  const [slots, setSlots] = React.useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = React.useState(false);

  React.useEffect(() => {
    if (!rejectTarget) {
      setRejectReason("");
    }
  }, [rejectTarget]);

  React.useEffect(() => {
    if (!rescheduleTarget) {
      setRescheduleReason("");
      setSelectedDate("");
      setSelectedSlot(null);
      setSlots([]);
      return;
    }

    const today = startOfDay(new Date());
    const bookingDate = startOfDay(new Date(rescheduleTarget.starts_at));
    const initialDate = isAfter(bookingDate, today) ? bookingDate : today;
    setSelectedDate(format(initialDate, "yyyy-MM-dd"));
    setSelectedSlot(null);
    setSlots([]);
    setRescheduleReason("");
  }, [rescheduleTarget]);

  React.useEffect(() => {
    if (!rescheduleTarget || !selectedDate) return;

    let mounted = true;

    const loadAvailability = async () => {
      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/availability?service_id=${rescheduleTarget.service.id}&specialist_id=${rescheduleTarget.specialist.id}&date=${selectedDate}&tz_offset_minutes=${getTimezoneOffsetMinutesForDate(selectedDate)}`,
          { cache: "no-store" },
        );
        const result = await readResponseJson<AvailabilityResponse>(response);

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load specialist availability.");
        }

        if (!mounted) return;
        const nextSlots = result.data ?? [];
        setSlots(nextSlots);
        setSelectedSlot((current) =>
          current && nextSlots.some((slot) => slot.starts_at === current.starts_at)
            ? current
            : null,
        );
      } catch (error) {
        if (!mounted) return;
        setSlots([]);
        setSelectedSlot(null);
        toast.error(
          error instanceof Error
            ? error.message
            : "Specialist availability could not be loaded.",
        );
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
  }, [rescheduleTarget, selectedDate]);

  const rejectBusy =
    actionBusyKey === "reject:bulk" ||
    actionBusyKey ===
      `reject:${rejectTarget?.mode === "single" ? rejectTarget.booking.id : ""}`;
  const rescheduleBusy =
    actionBusyKey === `reschedule:${rescheduleTarget ? rescheduleTarget.id : ""}`;
  const completeBusy = actionBusyKey === `complete:${completeTarget?.id ?? ""}`;

  return (
    <>
      <Sheet
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-xl overflow-y-auto border-l border-border bg-background sm:max-w-xl"
        >
          <SheetHeader className="border-b border-border/60 pb-4">
            <SheetTitle className="text-xl font-semibold">
              {rejectTarget?.mode === "bulk"
                ? "Reject selected bookings"
                : "Reject booking"}
            </SheetTitle>
            <SheetDescription>
              Record a mandatory reason so the customer notification and audit trail stay clear.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Rejection target
              </p>
              <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                {rejectTarget?.mode === "bulk"
                  ? `${rejectTarget.ids.length} bookings will be rejected.`
                  : rejectTarget?.booking
                    ? `${rejectTarget.booking.customer.name} | ${rejectTarget.booking.service.name} | ${formatDateTime(rejectTarget.booking.starts_at)}`
                    : "No booking selected."}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Reason</label>
                <Textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Explain why the booking is being rejected."
                  maxLength={500}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be shown to the customer in their booking notification.
                </p>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-border/60 bg-background/95">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRejectSubmit(rejectReason)}
              disabled={rejectBusy || !rejectReason.trim()}
            >
              {rejectBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Submit rejection
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(completeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null);
            setCompletionAftercare({
              instructions: "",
              what_to_do: "",
              what_to_avoid: "",
              important_notes: "",
            });
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-2xl overflow-y-auto border-l border-border bg-background sm:max-w-2xl"
        >
          <SheetHeader className="border-b border-border/60 pb-4">
            <SheetTitle className="text-xl font-semibold">
              Complete booking
            </SheetTitle>
            <SheetDescription>
              Mark the appointment as completed and optionally add booking-specific after-care guidance.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-4 pb-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Completion target
                </p>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                  {completeTarget
                    ? `${completeTarget.customer.name} | ${completeTarget.service.name} | ${formatDateTime(completeTarget.starts_at)}`
                    : "No booking selected."}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">
                  After-care guidance
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add booking-specific instructions now so the customer can receive them immediately after completion.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Guidance summary
                  </label>
                  <Textarea
                    value={completionAftercare.instructions}
                    onChange={(event) =>
                      setCompletionAftercare((current) => ({
                        ...current,
                        instructions: event.target.value,
                      }))
                    }
                    placeholder="Optional booking-specific after-care summary."
                    maxLength={4000}
                    rows={4}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      What to do
                    </label>
                    <Textarea
                      value={completionAftercare.what_to_do}
                      onChange={(event) =>
                        setCompletionAftercare((current) => ({
                          ...current,
                          what_to_do: event.target.value,
                        }))
                      }
                      placeholder="Optional recovery and care steps."
                      maxLength={4000}
                      rows={5}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      What to avoid
                    </label>
                    <Textarea
                      value={completionAftercare.what_to_avoid}
                      onChange={(event) =>
                        setCompletionAftercare((current) => ({
                          ...current,
                          what_to_avoid: event.target.value,
                        }))
                      }
                      placeholder="Optional activities or products to avoid."
                      maxLength={4000}
                      rows={5}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Important notes
                  </label>
                  <Textarea
                    value={completionAftercare.important_notes}
                    onChange={(event) =>
                      setCompletionAftercare((current) => ({
                        ...current,
                        important_notes: event.target.value,
                      }))
                    }
                    placeholder="Optional warnings, escalation notes, or contact guidance."
                    maxLength={4000}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>
          <SheetFooter className="border-t border-border/60 bg-background/95">
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>
              Close
            </Button>
            <Button
              className="bg-[#3E2723] text-white hover:bg-[#52342d]"
              onClick={() => void handleCompleteSubmit()}
              disabled={completeBusy}
            >
              {completeBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Send instructions
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleTarget(null);
            setRescheduleReason("");
            setSelectedDate("");
            setSelectedSlot(null);
            setSlots([]);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-2xl overflow-y-auto border-l border-border bg-background sm:max-w-2xl"
        >
          <SheetHeader className="border-b border-border/60 pb-4">
            <SheetTitle className="text-xl font-semibold">
              Reschedule booking
            </SheetTitle>
            <SheetDescription>
              Pick a new slot from the specialist&apos;s actual availability and keep a mandatory reason in the booking history.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Current booking
              </p>
              <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                {rescheduleTarget
                  ? `${rescheduleTarget.customer.name} | ${rescheduleTarget.service.name} | ${formatDateTime(rescheduleTarget.starts_at)}`
                  : "No booking selected."}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">Select date and time</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Available slots come directly from the specialist availability engine.
                  </p>
                </div>
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
                  emptyStateText="No slots are available for the selected date."
                  loadingText="Loading specialist availability..."
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Reason</label>
                <Textarea
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  placeholder="Explain why this booking is being moved."
                  maxLength={500}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be included in the customer notification.
                </p>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-border/60 bg-background/95">
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Close
            </Button>
            <Button
              className="bg-[#3E2723] text-white hover:bg-[#52342d]"
              onClick={() =>
                selectedSlot
                  ? void handleRescheduleSubmit({
                      startsAt: selectedSlot.starts_at,
                      endsAt: selectedSlot.ends_at,
                      reason: rescheduleReason,
                      tzOffsetMinutes: getTimezoneOffsetMinutesForDate(selectedDate),
                    })
                  : undefined
              }
              disabled={rescheduleBusy || !selectedSlot || !rescheduleReason.trim()}
            >
              {rescheduleBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Send proposal
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
