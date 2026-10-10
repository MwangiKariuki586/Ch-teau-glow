"use client";

import { format } from "date-fns";
import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
};

type RescheduleRequest = {
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

type BookingContext = {
  id: string;
  serviceId: string;
  specialistId: string;
  status: string;
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

export function BookingRescheduleRequestCard(props: {
  booking: BookingContext;
  request: RescheduleRequest;
  autoFocus?: boolean;
  onResolved: () => void;
  onRequestCancel: () => void;
}) {
  const { booking, request, autoFocus = false, onResolved, onRequestCancel } = props;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState<"accept" | "decline" | "propose" | null>(null);
  const [declineMessage, setDeclineMessage] = useState("");
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeMessage, setProposeMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!autoFocus || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [autoFocus]);

  useEffect(() => {
    if (!proposeOpen) return;
    const proposedDate = new Date(request.proposed_starts_at);
    if (!Number.isNaN(proposedDate.getTime())) {
      setSelectedDate(format(proposedDate, "yyyy-MM-dd"));
      setSelectedSlot(null);
      return;
    }

    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedSlot(null);
  }, [proposeOpen, request.proposed_starts_at]);

  useEffect(() => {
    if (!proposeOpen || !selectedDate) return;

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
          throw new Error(result.error ?? "Availability could not be loaded.");
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
            : "Availability could not be loaded.",
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
  }, [booking.serviceId, booking.specialistId, proposeOpen, selectedDate]);

  async function submitResponse(payload: Record<string, unknown>, mode: "accept" | "decline" | "propose") {
    setSubmitting(mode);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/reschedule-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await readResponseJson<{ error?: string; decision_reason?: string }>(response);
      if (!response.ok) {
        throw new Error(result.decision_reason ?? result.error ?? "The reschedule response could not be saved.");
      }

      if (mode === "accept") {
        toast.success("The new appointment time has been accepted.");
      } else if (mode === "decline") {
        toast.success("The proposed time has been declined.");
      } else {
        toast.success("Your preferred alternative time has been sent.");
        setProposeOpen(false);
      }

      onResolved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The reschedule response could not be saved.",
      );
    } finally {
      setSubmitting(null);
    }
  }

  const canOfferCancel = ["pending", "confirmed", "rescheduled"].includes(booking.status);

  if (request.status === "countered") {
    return (
      <div
        ref={cardRef}
        className="rounded-2xl border border-[#6B4423]/15 bg-[#FFF8F0] p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B4423]/70">
              Waiting for admin
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              You proposed a new time. We&apos;ll confirm soon.
            </h2>
            {request.customer_proposed_starts_at && request.customer_proposed_ends_at ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Proposed:{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(request.customer_proposed_starts_at), "EEE, MMM d, yyyy")}
                </span>
                {" · "}
                <span className="font-medium text-foreground">
                  {format(new Date(request.customer_proposed_starts_at), "h:mm a")} -{" "}
                  {format(new Date(request.customer_proposed_ends_at), "h:mm a")}
                </span>
              </p>
            ) : null}
            {request.customer_message ? (
              <p className="mt-2 text-sm text-muted-foreground">Your note: {request.customer_message}</p>
            ) : null}
          </div>
          <span className="rounded-full bg-[#6B4423]/10 px-3 py-1 text-xs font-medium text-[#6B4423]">
            Waiting for admin
          </span>
        </div>
        {canOfferCancel ? (
          <div className="mt-4">
            <Button
              variant="ghost"
              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={onRequestCancel}
            >
              Cancel booking
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div
        ref={cardRef}
        className="rounded-2xl border border-[#6B4423]/15 bg-[#FFF8F0] p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B4423]/70">
              Action required
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              Confirm your new appointment time
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Proposed time:{" "}
              <span className="font-medium text-foreground">
                {format(new Date(request.proposed_starts_at), "EEE, MMM d, yyyy")}
              </span>
              {" · "}
              <span className="font-medium text-foreground">
                {format(new Date(request.proposed_starts_at), "h:mm a")} - {format(new Date(request.proposed_ends_at), "h:mm a")}
              </span>
            </p>
          </div>
          <span className="rounded-full bg-[#6B4423]/10 px-3 py-1 text-xs font-medium text-[#6B4423]">
            Pending response
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-[#6B4423]/10 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Admin reason
          </p>
          <p className="mt-2 text-sm text-foreground">{request.reason}</p>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor={`decline-message-${request.id}`}>Message (optional)</Label>
          <Textarea
            id={`decline-message-${request.id}`}
            value={declineMessage}
            onChange={(event) => setDeclineMessage(event.target.value)}
            placeholder="Add context if you need a different time or want to explain your response."
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            className="bg-[#3E2723] text-white hover:bg-[#52342d]"
            disabled={submitting !== null}
            onClick={() => void submitResponse({ response: "accepted" }, "accept")}
          >
            {submitting === "accept" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Accept new time
          </Button>
          <Button
            variant="outline"
            disabled={submitting !== null}
            onClick={() => setProposeOpen(true)}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Choose a different time
          </Button>
          <Button
            variant="outline"
            disabled={submitting !== null}
            onClick={() =>
              void submitResponse(
                {
                  response: "declined",
                  message: declineMessage.trim() || undefined,
                },
                "decline",
              )
            }
          >
            {submitting === "decline" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Decline
          </Button>
          {canOfferCancel ? (
            <Button
              variant="ghost"
              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              disabled={submitting !== null}
              onClick={onRequestCancel}
            >
              Cancel booking
            </Button>
          ) : null}
        </div>
      </div>

      <Sheet open={proposeOpen} onOpenChange={setProposeOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Choose a different time</SheetTitle>
            <SheetDescription>
              Pick an alternative slot from the specialist&apos;s live availability.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-2">
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
              emptyStateText="No slots are available for that date."
              loadingText="Loading availability..."
            />

            <div className="space-y-2">
              <Label htmlFor={`propose-message-${request.id}`}>Message (optional)</Label>
              <Textarea
                id={`propose-message-${request.id}`}
                value={proposeMessage}
                onChange={(event) => setProposeMessage(event.target.value)}
                placeholder="Add context for the admin team."
                maxLength={500}
                rows={4}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setProposeOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-[#3E2723] text-white hover:bg-[#52342d]"
              disabled={submitting !== null || !selectedSlot}
              onClick={() =>
                selectedSlot
                  ? void submitResponse(
                      {
                        response: "proposed_new_time",
                        customer_proposed_starts_at: selectedSlot.starts_at,
                        customer_proposed_ends_at: selectedSlot.ends_at,
                        message: proposeMessage.trim() || undefined,
                      },
                      "propose",
                    )
                  : undefined
              }
            >
              {submitting === "propose" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Send alternative time
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

