"use client";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  colorClassName,
}: {
  label: string;
  value: number;
  colorClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-3 text-4xl font-semibold tracking-tight", colorClassName)}>{value}</p>
    </div>
  );
}
