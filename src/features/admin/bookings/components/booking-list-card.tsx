"use client";

import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import type { AdminBookingRow } from "../lib/types";

export function BookingListCard({
  booking,
  isSelected,
  onClick,
}: {
  booking: AdminBookingRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 transition-colors",
        "border-b border-gray-200",
        "hover:bg-[#FFF8F0]",
        isSelected
          ? "bg-[#FFF4E2] border-l-2 border-l-[#C9A96E]"
          : "border-l-2 border-l-transparent",
        booking.requires_attention && !isSelected && "bg-amber-50/40",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-medium text-sm text-foreground leading-snug line-clamp-1">
          {booking.customer.name}
        </p>
        <StatusBadge status={booking.status} />
      </div>

      <p className="text-xs text-muted-foreground line-clamp-1">
        {booking.booking_kind === "package" && booking.package
          ? booking.package.name
          : booking.service.name}
      </p>

      {booking.requires_attention && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          <ShieldAlert className="h-3 w-3" />
          Needs attention
        </div>
      )}
    </button>
  );
}
