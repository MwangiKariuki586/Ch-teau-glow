"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  AlertTriangle,
  TrendingDown,
  Eye,
  Loader2,
  CheckCircle2,
  X,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type {
  InventoryReconciliation,
  ReconciliationLine,
  InventoryMovement,
} from "../types";
import {
  formatDate,
  formatMovementType,
  movementTypeColor,
  formatDelta,
} from "../utils";

// ── Constants ────────────────────────────────────────────────────────────────

const LARGE_DELTA_THRESHOLD = 10;

type FilterChip =
  | "all"
  | "adjustments"
  | "matched"
  | "zero_count"
  | "large_delta";

// ── Flags ────────────────────────────────────────────────────────────────────

function getFlags(line: ReconciliationLine): string[] {
  const flags: string[] = [];
  const delta = Number(line.delta_qty);
  const system = Number(line.system_qty);
  const counted = Number(line.counted_qty);
  if (counted === 0 && system > 0) flags.push("review");
  if (Math.abs(delta) >= LARGE_DELTA_THRESHOLD) flags.push("large_change");
  return flags;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FlagTag({ flag }: { flag: string }) {
  if (flag === "review") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="h-2.5 w-2.5" />
        Review
      </span>
    );
  }
  if (flag === "large_change") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        <TrendingDown className="h-2.5 w-2.5" />
        Large
      </span>
    );
  }
  return null;
}

function AdjustmentsTable({ lines }: { lines: ReconciliationLine[] }) {
  if (lines.length === 0) return null;
  return (
    <table className="w-full table-fixed text-sm">
      <colgroup>
        <col />
        <col className="w-14" />
        <col className="w-14" />
        <col className="w-14" />
      </colgroup>
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
            Item
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
            Before
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
            After
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
            Delta
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          const delta = Number(line.delta_qty);
          const flags = getFlags(line);
          return (
            <tr
              key={line.id}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="px-3 py-2">
                <div className="flex items-start gap-1.5 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-snug truncate">
                      {line.inventory_items?.name ?? line.inventory_item_id}
                    </p>
                    {line.inventory_items?.sku && (
                      <p className="text-xs text-gray-400">
                        {line.inventory_items.sku}
                      </p>
                    )}
                  </div>
                  {flags.map((f) => (
                    <FlagTag key={f} flag={f} />
                  ))}
                </div>
              </td>
              <td className="px-3 py-2 text-right text-gray-400 text-sm align-top pt-2.5">
                {line.system_qty}
              </td>
              <td className="px-3 py-2 text-right text-gray-700 font-medium text-sm align-top pt-2.5">
                {line.counted_qty}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-mono font-semibold text-sm align-top pt-2.5",
                  delta > 0 ? "text-emerald-600" : "text-rose-500",
                )}
              >
                {delta > 0 ? `+${delta}` : delta}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MatchedTable({ lines }: { lines: ReconciliationLine[] }) {
  if (lines.length === 0) return null;
  return (
    <table className="w-full table-fixed text-sm">
      <colgroup>
        <col />
        <col className="w-14" />
        <col className="w-14" />
      </colgroup>
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
            Item
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
            System
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
            Counted
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.id} className="border-b border-gray-100 last:border-0">
            <td className="px-3 py-1.5 text-sm text-gray-600">
              {line.inventory_items?.name ?? line.inventory_item_id}
              {line.inventory_items?.sku && (
                <span className="text-xs text-gray-400 ml-1.5">
                  {line.inventory_items.sku}
                </span>
              )}
            </td>
            <td className="px-3 py-1.5 text-right text-sm text-gray-400">
              {line.system_qty}
            </td>
            <td className="px-3 py-1.5 text-right text-sm text-gray-500">
              {line.counted_qty}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Apply Confirmation ────────────────────────────────────────────────────────

function ApplyConfirmation({
  reconciliation,
  adjustedLines,
  onConfirm,
  onCancel,
  applying,
}: {
  reconciliation: InventoryReconciliation;
  adjustedLines: ReconciliationLine[];
  onConfirm: () => void;
  onCancel: () => void;
  applying: boolean;
}) {
  const totalPositive = adjustedLines
    .filter((l) => Number(l.delta_qty) > 0)
    .reduce((s, l) => s + Number(l.delta_qty), 0);
  const totalNegative = adjustedLines
    .filter((l) => Number(l.delta_qty) < 0)
    .reduce((s, l) => s + Number(l.delta_qty), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Confirm Apply</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {reconciliation.branches?.name ?? reconciliation.branch_id}
        </p>
      </div>

      <div className="px-6 py-5 flex-1 overflow-y-auto space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          You're about to apply{" "}
          <span className="font-semibold">
            {adjustedLines.length} adjustment
            {adjustedLines.length !== 1 ? "s" : ""}
          </span>
          {totalPositive > 0 && (
            <span className="text-emerald-700 font-semibold">
              {" "}
              +{totalPositive}
            </span>
          )}
          {totalNegative < 0 && (
            <span className="text-rose-600 font-semibold">
              {" "}
              {totalNegative}
            </span>
          )}{" "}
          to{" "}
          <span className="font-semibold">
            {reconciliation.branches?.name ?? "this branch"}
          </span>
          . This cannot be undone.
        </div>

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <AdjustmentsTable lines={adjustedLines} />
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-gray-200"
          onClick={onCancel}
          disabled={applying}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 bg-[#6B4423] hover:bg-[#4A2C1A] text-white"
          onClick={onConfirm}
          disabled={applying}
        >
          {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Apply Changes
        </Button>
      </div>
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────

interface Props {
  reconciliation: InventoryReconciliation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: () => void;
}

export function ReconciliationDetailsDrawer({
  reconciliation: r,
  open,
  onOpenChange,
  onApplied,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterChip>("all");
  const [matchedExpanded, setMatchedExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  if (!r) return null;

  const lines = r.inventory_reconciliation_lines ?? [];
  const adjustedLines = lines.filter((l) => Number(l.delta_qty) !== 0);
  const matchedLines = lines.filter((l) => Number(l.delta_qty) === 0);
  const zeroCountLines = lines.filter(
    (l) => Number(l.counted_qty) === 0 && Number(l.system_qty) > 0,
  );
  const largeDeltaLines = lines.filter(
    (l) => Math.abs(Number(l.delta_qty)) >= LARGE_DELTA_THRESHOLD,
  );

  const totalPositive = adjustedLines
    .filter((l) => Number(l.delta_qty) > 0)
    .reduce((s, l) => s + Number(l.delta_qty), 0);
  const totalNegative = adjustedLines
    .filter((l) => Number(l.delta_qty) < 0)
    .reduce((s, l) => s + Number(l.delta_qty), 0);

  // Filter + search
  const filterLines = (pool: ReconciliationLine[]) => {
    let result = pool;
    if (filter === "adjustments") result = adjustedLines;
    else if (filter === "matched") result = matchedLines;
    else if (filter === "zero_count") result = zeroCountLines;
    else if (filter === "large_delta") result = largeDeltaLines;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.inventory_items?.name?.toLowerCase().includes(q) ||
          l.inventory_items?.sku?.toLowerCase().includes(q),
      );
    }
    return result;
  };

  const visibleAdjusted = filterLines(adjustedLines);
  const visibleMatched = filterLines(matchedLines);
  const isFiltering = filter !== "all" || search.trim() !== "";

  const FILTER_CHIPS = (
    [
      { id: "all" as const, label: "All", count: lines.length },
      {
        id: "adjustments" as const,
        label: "Adjustments",
        count: adjustedLines.length,
      },
      { id: "matched" as const, label: "Matched", count: matchedLines.length },
      {
        id: "zero_count" as const,
        label: "Zero count",
        count: zeroCountLines.length,
      },
      {
        id: "large_delta" as const,
        label: `Large (≥${LARGE_DELTA_THRESHOLD})`,
        count: largeDeltaLines.length,
      },
    ] satisfies { id: FilterChip; label: string; count: number }[]
  ).filter((c) => c.count > 0 || c.id === "all");

  const handleApply = async () => {
    if (!r) return;
    setApplying(true);
    try {
      const res = await fetch(
        `/api/admin/inventory/reconciliations/${r.id}/apply`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to apply.");
      toast.success("Reconciliation applied. Stock levels updated.");
      setShowConfirm(false);
      onApplied?.();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error("Failed to apply.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setApplying(false);
    }
  };

  const handleViewMovements = async () => {
    setMovementsLoading(true);
    setShowMovements(true);
    try {
      const res = await fetch(
        `/api/admin/inventory/movements?reference_type=inventory_reconciliation&reference_id=${r.id}`,
      );
      const json = await res.json();
      setMovements(json.data ?? []);
    } catch {
      toast.error("Failed to load movements.");
    } finally {
      setMovementsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (showMovements) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full max-w-lg p-0 flex flex-col h-full"
        >
          <div className="shrink-0 px-6 pt-5 pb-4 border-b border-gray-100">
            <button
              onClick={() => setShowMovements(false)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to details
            </button>
            <h2 className="text-base font-semibold text-gray-900">Movements</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {r.branches?.name ?? r.branch_id} · {formatDate(r.created_at)}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {movementsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#6B4423]" />
              </div>
            ) : movements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">
                No movements found for this reconciliation.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      Item
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                      Delta
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-4 py-2 text-sm text-gray-700 font-medium">
                        {m.inventory_item_id}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2 text-right font-mono font-semibold text-sm",
                          Number(m.quantity_delta) > 0
                            ? "text-emerald-600"
                            : "text-rose-500",
                        )}
                      >
                        {Number(m.quantity_delta) > 0
                          ? `+${m.quantity_delta}`
                          : m.quantity_delta}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(m.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="shrink-0 px-6 py-4 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-gray-200 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (showConfirm) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full max-w-lg p-0 flex flex-col"
        >
          <ApplyConfirmation
            reconciliation={r}
            adjustedLines={adjustedLines}
            onConfirm={handleApply}
            onCancel={() => setShowConfirm(false)}
            applying={applying}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-lg p-0 flex flex-col h-full"
      >
        {/* ── Sticky header ── */}
        <div className="shrink-0 px-6 pt-5 pb-0 border-b border-gray-100">
          <SheetHeader className="space-y-0.5 mb-3">
            <SheetTitle className="text-base">
              Reconciliation Details
            </SheetTitle>
            <SheetDescription className="text-sm">
              {r.branches?.name ?? r.branch_id} · {formatDate(r.created_at)}
            </SheetDescription>
          </SheetHeader>

          {/* Summary strip */}
          <div className="flex items-center gap-2 flex-wrap pb-3 text-sm">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium",
                r.status === "applied"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : r.status === "draft"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-gray-100 text-gray-600 border-gray-200",
              )}
            >
              {r.status === "draft"
                ? "Draft (not applied)"
                : r.status === "applied"
                  ? "Applied (locked)"
                  : r.status}
            </Badge>
            <span className="text-gray-500">{lines.length} items</span>
            {adjustedLines.length > 0 ? (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-700 font-medium">
                  {adjustedLines.length} adjusted
                </span>
                {totalPositive > 0 && (
                  <span className="text-emerald-600 font-semibold">
                    +{totalPositive}
                  </span>
                )}
                {totalNegative < 0 && (
                  <span className="text-rose-500 font-semibold">
                    {totalNegative}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400">no changes</span>
              </>
            )}
            {r.applied_at && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400 text-xs">
                  Applied {formatDate(r.applied_at)}
                </span>
              </>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item or SKU"
              className="pl-8 h-8 text-sm border-gray-200"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 flex-wrap pb-3">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                  filter === chip.id
                    ? "bg-[#3E2723] text-white border-[#3E2723]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                )}
              >
                {chip.label}
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    filter === chip.id ? "text-white/70" : "text-gray-400",
                  )}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {lines.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">
              No lines recorded.
            </p>
          )}

          {/* Adjustments section */}
          {(filter === "all" ||
            filter === "adjustments" ||
            filter === "zero_count" ||
            filter === "large_delta") &&
            visibleAdjusted.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Adjustments ({visibleAdjusted.length})
                </p>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <AdjustmentsTable lines={visibleAdjusted} />
                </div>
              </div>
            )}

          {/* No adjustments message */}
          {!isFiltering && adjustedLines.length === 0 && lines.length > 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-5 text-center">
              <p className="text-sm font-medium text-gray-600">
                No adjustments
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                All counted quantities matched system values.
              </p>
            </div>
          )}

          {/* Matched counts section — collapsible */}
          {(filter === "all" || filter === "matched") &&
            visibleMatched.length > 0 && (
              <div>
                <button
                  onClick={() => setMatchedExpanded((v) => !v)}
                  className="flex items-center gap-2 w-full text-left mb-2 group"
                >
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Matched Counts ({visibleMatched.length})
                  </p>
                  {matchedExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  {!matchedExpanded && (
                    <span className="text-xs text-gray-400 ml-1">
                      {visibleMatched
                        .slice(0, 2)
                        .map((l) => l.inventory_items?.name)
                        .filter(Boolean)
                        .join(", ")}
                      {visibleMatched.length > 2 &&
                        ` +${visibleMatched.length - 2} more`}
                    </span>
                  )}
                </button>
                {matchedExpanded && (
                  <div className="rounded-lg border border-gray-100 overflow-hidden">
                    <MatchedTable lines={visibleMatched} />
                  </div>
                )}
              </div>
            )}

          {/* Search empty state */}
          {isFiltering &&
            visibleAdjusted.length === 0 &&
            visibleMatched.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                No items match your search.
              </p>
            )}
        </div>

        {/* ── Sticky footer — draft only ── */}
        {r.status === "draft" && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-600 text-xs"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                disabled={adjustedLines.length === 0}
                onClick={() => setShowConfirm(true)}
                className="flex-1 bg-[#6B4423] hover:bg-[#4A2C1A] text-white text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Apply{" "}
                {adjustedLines.length > 0
                  ? `${adjustedLines.length} change${adjustedLines.length !== 1 ? "s" : ""}`
                  : "changes"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
