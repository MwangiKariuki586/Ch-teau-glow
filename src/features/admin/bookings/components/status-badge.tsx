"use client";

import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/lib/constants/booking-status";
import { cn } from "@/lib/utils";
import { STATUS_META } from "../lib/config";

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;

  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 font-medium", meta.className)}
    >
      {meta.label}
    </Badge>
  );
}
