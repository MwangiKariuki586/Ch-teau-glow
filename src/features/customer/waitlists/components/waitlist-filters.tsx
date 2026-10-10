"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterType = "all" | "available" | "active" | "expired";
export type SortType = "expiring" | "newest" | "branch";

export function WaitlistFilters({
  filter,
  onFilterChange,
  sort,
  onSortChange,
}: {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  sort: SortType;
  onSortChange: (sort: SortType) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("available")}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            filter === "available"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Times available
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("active")}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            filter === "active"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Active requests
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("expired")}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            filter === "expired"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Expired
        </button>
      </div>

      <Select
        value={sort}
        onValueChange={(value) => onSortChange(value as SortType)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expiring">Expiring soon</SelectItem>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="branch">Branch</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
