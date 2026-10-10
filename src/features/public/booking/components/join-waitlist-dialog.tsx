"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch, Service, Specialist } from "../hooks/useBookingFlow";

type JoinWaitlistDialogProps = {
  service: Service;
  branch: Branch;
  specialist: Specialist;
  selectedDate?: string;
};

function formatDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function JoinWaitlistDialog({
  service,
  branch,
  specialist,
  selectedDate,
}: JoinWaitlistDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rangeDays, setRangeDays] = useState("7");
  const [timeWindow, setTimeWindow] = useState<string>("any");
  const [preferredSpecialist, setPreferredSpecialist] = useState<string>("any");
  const [submitting, setSubmitting] = useState(false);

  const dateSummary = useMemo(() => {
    const start = selectedDate
      ? new Date(`${selectedDate}T12:00:00`)
      : new Date();
    const end = addDays(start, Number(rangeDays) - 1);
    return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
  }, [rangeDays, selectedDate]);

  const handleSubmit = async () => {
    const start = selectedDate
      ? new Date(`${selectedDate}T12:00:00`)
      : new Date();
    const dateFrom = formatDateKey(start);
    const dateTo = formatDateKey(addDays(start, Number(rangeDays) - 1));

    setSubmitting(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: service.id,
          branch_id: branch.id,
          preferred_specialist_id:
            preferredSpecialist === "any" ? null : preferredSpecialist,
          date_from: dateFrom,
          date_to: dateTo,
          time_window: timeWindow === "any" ? null : timeWindow,
          // Capture the user's UTC offset so the dispatcher can call
          // buildAvailableSlotsForDate with the same timezone the booking
          // page used — preventing offers for slots that don't actually show up.
          tz_offset_minutes: new Date(
            `${dateFrom}T12:00:00`,
          ).getTimezoneOffset(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sign in to join the waitlist.");
          router.push("/auth/signin");
          return;
        }
        throw new Error(result.error ?? "Failed to join waitlist.");
      }

      toast.success("We’ll notify you when a slot becomes available.");
      setOpen(false);
      router.push("/customer/waitlists");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join waitlist.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="rounded-full">
          Join Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Join the waitlist</DialogTitle>
          <DialogDescription>
            We’ll watch for a real opening at {branch.name} and let you know as
            soon as a bookable slot appears.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
          <p className="font-medium text-foreground">{service.name}</p>
          <p className="text-muted-foreground">{branch.name}</p>
          <p className="text-muted-foreground">
            Default match: any specialist at this branch
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date range</Label>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{dateSummary}</p>
          </div>

          <div className="space-y-2">
            <Label>Time of day</Label>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger>
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Specialist preference</Label>
            <Select
              value={preferredSpecialist}
              onValueChange={setPreferredSpecialist}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any specialist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any specialist</SelectItem>
                <SelectItem value={specialist.id}>
                  Prefer {specialist.name}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Close
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Joining..." : "Join waitlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
