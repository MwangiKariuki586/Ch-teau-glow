"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function LoadingScreen({
  title = "Loading",
  description = "Please wait while we prepare this step.",
  className,
  compact = false,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-center",
        compact ? "min-h-40 px-6 py-8" : "min-h-[320px] px-8 py-12",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
        <Spinner className="size-5 text-primary" />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
