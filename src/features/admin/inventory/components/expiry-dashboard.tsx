"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarX2,
  GitBranch,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Branch, InventoryBatch } from "../types";

const DAYS_OPTIONS = [
  { value: "7", label: "Next 7 days" },
  { value: "14", label: "Next 14 days" },
  { value: "30", label: "Next 30 days" },
  { value: "60", label: "Next 60 days" },
  { value: "90", label: "Next 90 days" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All batches" },
  { value: "expired", label: "Expired only" },
  { value: "expiring-soon", label: "Expiring soon" },
] as const;

type ExpiryStatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

function resolveStatusFilter(value: string | null): ExpiryStatusFilter {
  if (value === "expired" || value === "expiring-soon") {
    return value;
  }
  return "all";
}

export function ExpiryDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("all");
  const [daysAhead, setDaysAhead] = useState("30");
  const [loading, setLoading] = useState(true);
  const [writingOff, setWritingOff] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    const res = await fetch("/api/branches-list");
    const json = await res.json();
    setBranches(json.data ?? []);
  }, []);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days_ahead: daysAhead });
      if (branchId !== "all") params.set("branch_id", branchId);
      const statusFilter = resolveStatusFilter(searchParams.get("tab"));
      if (statusFilter !== "all") {
        params.set(
          "status",
          statusFilter === "expiring-soon" ? "expiring_soon" : statusFilter,
        );
      }
      const res = await fetch(`/api/admin/inventory/expiry?${params}`);
      const json = await res.json();
      setBatches(json.data ?? []);
    } catch {
      toast.error("Failed to load expiry data.");
    } finally {
      setLoading(false);
    }
  }, [branchId, daysAhead, searchParams]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);
  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleWriteOff = async (batch: InventoryBatch) => {
    if (
      !confirm(
        `Write off ${batch.quantity} ${batch.inventory_items?.unit ?? "unit"}(s) from batch ${batch.lot_number ?? batch.id.slice(0, 8)}?`,
      )
    )
      return;
    setWritingOff(batch.id);
    try {
      const res = await fetch(
        `/api/admin/inventory/batches/${batch.id}/write-off`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: `Expiry write-off — expires ${batch.expires_at}`,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Write-off failed.");
      toast.success(`Written off ${batch.quantity} units.`);
      fetchBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Write-off failed.");
    } finally {
      setWritingOff(null);
    }
  };

  const statusFilter = resolveStatusFilter(searchParams.get("tab"));
  const expiredCount = useMemo(
    () => batches.filter((batch) => batch.severity === "expired").length,
    [batches],
  );
  const expiringSoonCount = useMemo(
    () => batches.filter((batch) => batch.severity === "expiring_soon").length,
    [batches],
  );

  const updateStatusFilter = useCallback(
    (nextFilter: ExpiryStatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextFilter === "all") {
        params.delete("tab");
      } else {
        params.set("tab", nextFilter);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading expiry data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-[180px] border-gray-200 bg-white shadow-sm">
            <GitBranch className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={daysAhead} onValueChange={setDaysAhead}>
          <SelectTrigger className="w-[160px] border-gray-200 bg-white shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={updateStatusFilter}>
          <SelectTrigger className="w-[170px] border-gray-200 bg-white shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3 text-sm text-gray-500">
          {expiredCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertTriangle className="h-4 w-4" />
              {expiredCount} expired
            </span>
          )}
          {expiringSoonCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle className="h-4 w-4" />
              {expiringSoonCount} expiring soon
            </span>
          )}
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <CalendarX2 className="h-10 w-10" />
          <p className="text-sm font-medium text-gray-600">
            {statusFilter === "expired"
              ? "No expired batches found"
              : statusFilter === "expiring-soon"
                ? "No expiring-soon batches found"
                : "No expiring batches found"}
          </p>
          <p className="text-xs text-gray-400">
            Items with expiry dates will appear here when they approach expiry.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead>Item</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Lot Number</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow
                  key={batch.id}
                  className={cn(
                    "hover:bg-gray-50/50 transition-colors",
                    batch.severity === "expired" && "bg-red-50/30",
                  )}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {batch.inventory_items?.name ?? "—"}
                      </p>
                      {batch.inventory_items?.sku && (
                        <p className="text-xs text-gray-400">
                          {batch.inventory_items.sku}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {batch.branches?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 font-mono">
                    {batch.lot_number ?? (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-gray-900">
                    {batch.quantity} {batch.inventory_items?.unit ?? ""}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {batch.expires_at ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "text-xs font-medium border",
                        batch.severity === "expired"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200",
                      )}
                    >
                      {batch.severity === "expired"
                        ? "Expired"
                        : "Expiring Soon"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {batch.severity === "expired" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-xs text-rose-500 hover:bg-rose-50"
                        disabled={writingOff === batch.id}
                        onClick={() => handleWriteOff(batch)}
                      >
                        {writingOff === batch.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Write Off
                      </Button>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">
                        Monitor
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
