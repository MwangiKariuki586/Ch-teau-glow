"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ServiceListItem } from "../hooks/use-services-queue";

const STATUS_CLASSES = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-gray-200 bg-gray-100 text-gray-600",
  archived: "border-rose-200 bg-rose-50 text-rose-600",
};

function formatPrice(min: number, max: number, currency: string) {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return min === max ? fmt.format(min / 100) : `${fmt.format(min / 100)} – ${fmt.format(max / 100)}`;
}

export function ServiceListCard({
  service,
  isSelected,
  onClick,
}: {
  service: ServiceListItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 transition-colors border-b border-gray-200",
        "hover:bg-[#FFF8F0]",
        isSelected
          ? "bg-[#FFF4E2] border-l-2 border-l-[#C9A96E]"
          : "border-l-2 border-l-transparent",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-medium text-sm text-foreground leading-snug line-clamp-1">
          {service.name}
        </p>
        <Badge
          variant="outline"
          className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_CLASSES[service.status])}
        >
          {service.status}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-1">
        {service.category?.name ?? "Uncategorized"}
      </p>

      <p className="text-xs text-muted-foreground mt-0.5">
        {formatPrice(service.min_price_cents, service.max_price_cents, service.currency)}
        {" · "}
        {service.duration_minutes} min
        {service.is_featured && " · ⭐ Featured"}
      </p>
    </button>
  );
}
