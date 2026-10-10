"use client";

import { addDays, format, startOfDay } from "date-fns";
import { CalendarDays, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type AvailabilitySlotPickerSlot = {
  starts_at: string;
  ends_at: string;
};

type AvailabilitySlotPickerProps = {
  selectedDate: string;
  onDateChange: (dateKey: string) => void;
  selectedSlot: AvailabilitySlotPickerSlot | null;
  onSlotChange: (slot: AvailabilitySlotPickerSlot) => void;
  slots: AvailabilitySlotPickerSlot[];
  loadingSlots: boolean;
  disabled?: boolean;
  dateLabel?: string;
  slotLabel?: string;
  emptyStateText?: string;
  loadingText?: string;
  dayRange?: number;
};

function toDateKey(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function parseDateKey(dateKey: string) {
  const parsed = new Date(`${dateKey}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatTimeRangeLabel(startsAt: string, endsAt: string) {
  return `${format(new Date(startsAt), "h:mm a").toLowerCase()} - ${format(
    new Date(endsAt),
    "h:mm a",
  ).toLowerCase()}`;
}

export function AvailabilitySlotPicker({
  selectedDate,
  onDateChange,
  selectedSlot,
  onSlotChange,
  slots,
  loadingSlots,
  disabled = false,
  dateLabel = "Select date",
  slotLabel = "Available time slots",
  emptyStateText = "No slots are available for the selected date.",
  loadingText = "Loading availability...",
  dayRange = 90,
}: AvailabilitySlotPickerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedDateValue = selectedDate ? parseDateKey(selectedDate) : undefined;
  const maxDate = useMemo(() => addDays(today, dayRange), [dayRange, today]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{dateLabel}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-11 w-full justify-between rounded-xl border-border/70 bg-background px-4 text-left font-medium"
            >
              <span>
                {selectedDateValue ? format(selectedDateValue, "EEEE, MMM d, yyyy") : "Choose a date"}
              </span>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto rounded-2xl p-0">
            <Calendar
              mode="single"
              selected={selectedDateValue}
              onSelect={(date) => {
                if (date) {
                  onDateChange(toDateKey(date));
                }
              }}
              disabled={(date) => date < today || date > maxDate}
              className="rounded-2xl"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>{slotLabel}</Label>
        {loadingSlots ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyStateText}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) => {
              const selected = selectedSlot?.starts_at === slot.starts_at;
              return (
                <Button
                  key={slot.starts_at}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  className={
                    selected
                      ? "h-auto justify-center rounded-xl bg-[#3E2723] px-3 py-3 text-center text-white hover:bg-[#52342d]"
                      : "h-auto justify-center rounded-xl px-3 py-3 text-center"
                  }
                  disabled={disabled}
                  onClick={() => onSlotChange(slot)}
                >
                  {formatTimeRangeLabel(slot.starts_at, slot.ends_at)}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

