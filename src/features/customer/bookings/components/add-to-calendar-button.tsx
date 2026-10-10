"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddToCalendarButton(props: {
  bookingId: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const { bookingId, variant = "outline", size = "sm", className } = props;

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a href={`/api/bookings/${bookingId}/calendar.ics`}>
        <CalendarPlus className="mr-2 h-4 w-4" />
        Add to calendar
      </a>
    </Button>
  );
}
