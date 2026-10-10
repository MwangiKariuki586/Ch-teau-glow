"use client";

import { LoadingScreen } from "@/components/loading-screen";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JoinWaitlistDialog } from "./join-waitlist-dialog";
import { Service, Branch, Specialist } from "../hooks/useBookingFlow";

interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
}

interface BookingFormProps {
  service: Service;
  branch: Branch;
  specialist: Specialist;
  mode?: "service" | "package";
  onSlotSelected: (slot: { starts_at: string; ends_at: string }) => void;
}

function getTimezoneOffsetMinutesForDate(dateKey: string) {
  const localMidday = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(localMidday.getTime())) {
    return new Date().getTimezoneOffset();
  }
  return localMidday.getTimezoneOffset();
}

export function BookingForm({
  service,
  branch,
  specialist,
  mode = "service",
  onSlotSelected,
}: BookingFormProps) {
  const isPackageBooking = mode === "package";
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate specialist is assigned to this branch (many-to-many — no client-side branch_id check needed)
  useEffect(() => {
    setValidationErrors([]);
  }, [specialist, branch]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    let isMounted = true;
    const fetchAvailability = async () => {
      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/availability?service_id=${service.id}&specialist_id=${specialist.id}&date=${selectedDate}&tz_offset_minutes=${getTimezoneOffsetMinutesForDate(selectedDate)}`,
          {
            cache: "no-store",
          },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              (isPackageBooking
                ? "Failed to load package intake availability."
                : "Failed to load availability."),
          );
        }

        if (!isMounted) return;

        setSlots(result.data ?? []);
        setSelectedSlot(null);
      } catch (error) {
        if (!isMounted) return;

        const errorMessage =
          error instanceof Error
            ? error.message
            : isPackageBooking
              ? "Failed to load package intake availability."
              : "Failed to load availability.";
        toast.error(errorMessage);
        setSlots([]);
      } finally {
        if (isMounted) {
          setLoadingSlots(false);
        }
      }
    };

    void fetchAvailability();

    return () => {
      isMounted = false;
    };
  }, [isPackageBooking, selectedDate, service.id, specialist.id]);

  const handleProceedToPayment = () => {
    if (!selectedSlot) {
      toast.error("Please select a time slot before proceeding.");
      return;
    }

    onSlotSelected(selectedSlot);
  };

  const formatPriceRange = (service: Service) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: service.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    if (service.min_price_cents === service.max_price_cents) {
      return formatter.format(service.min_price_cents / 100);
    }

    return `${formatter.format(service.min_price_cents / 100)} - ${formatter.format(service.max_price_cents / 100)}`;
  };

  return (
    <div className="space-y-4">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <h4 className="font-medium text-destructive mb-2">
            Please fix the following issues:
          </h4>
          <ul className="text-sm text-destructive space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Date Selection */}
      <div className="space-y-2">
        <Label htmlFor="booking-date">
          {isPackageBooking ? "Select Intake Date" : "Select Date"}
        </Label>
        <Input
          id="booking-date"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          min={format(new Date(), "yyyy-MM-dd")}
        />
      </div>

      {/* Time Slot Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {isPackageBooking ? "Available Intake Slots" : "Available Time Slots"}
        </p>
        {!selectedDate && (
          <p className="text-sm text-muted-foreground">
            {isPackageBooking
              ? "Select a date to see available intake slots."
              : "Select a date to see available time slots."}
          </p>
        )}
        {loadingSlots && (
          <LoadingScreen
            compact
            title={isPackageBooking ? "Loading intake slots" : "Loading time slots"}
            description={
              isPackageBooking
                ? "Checking the latest intake availability for your selected date."
                : "Checking the latest availability for your selected date."
            }
          />
        )}
        {!loadingSlots && selectedDate && slots.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              {isPackageBooking
                ? "No intake slots are available for the selected date. Please try a different date or join the waitlist."
                : "No time slots are available for the selected date. Please try a different date or join the waitlist."}
            </p>
            <div className="mt-3">
              <JoinWaitlistDialog
                service={service}
                branch={branch}
                specialist={specialist}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((slot) => (
            <Button
              key={slot.starts_at}
              type="button"
              variant={
                selectedSlot?.starts_at === slot.starts_at
                  ? "default"
                  : "outline"
              }
              onClick={() => setSelectedSlot(slot)}
            >
              {format(new Date(slot.starts_at), "hh:mm a")} -{" "}
              {format(new Date(slot.ends_at), "hh:mm a")}
            </Button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="booking-notes">Notes (optional)</Label>
        <Input
          id="booking-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={
            isPackageBooking
              ? "Any intake notes or package preferences..."
              : "Any special requests or notes..."
          }
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {notes.length}/500 characters
        </p>
      </div>

      {/* Proceed to Payment Button */}
      <Button
        type="button"
        onClick={handleProceedToPayment}
        disabled={!selectedSlot || validationErrors.length > 0}
        className="w-full rounded-full px-6"
      >
        {isPackageBooking ? "Continue to Package Payment" : "Proceed to Payment"}
      </Button>
    </div>
  );
}
