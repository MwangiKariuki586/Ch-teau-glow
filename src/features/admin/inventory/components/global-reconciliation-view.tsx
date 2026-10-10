"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2, CheckCircle2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  Branch,
  InventoryReconciliation,
  ReconciliationLine,
} from "../types";
import { reconciliationStatusColor, formatDate } from "../utils";
import { ReconciliationDetailsDrawer } from "./reconciliation-details-drawer";

interface Props {
  branches: Branch[];
}

export function GlobalReconciliationView({ branches }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [reconciliations, setReconciliations] = useState<
    InventoryReconciliation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [activeRecon, setActiveRecon] =
    useState<InventoryReconciliation | null>(null);
  const [lines, setLines] = useState<ReconciliationLine[]>([]);
  const [applying, setApplying] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailRecon, setDetailRecon] =
    useState<InventoryReconciliation | null>(null);

  const fetchReconciliations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/inventory/reconciliations?${params}`);
      const json = await res.json();
      setReconciliations(json.data ?? []);
    } catch {
      toast.error("Failed to load reconciliations.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReconciliations();
  }, [fetchReconciliations]);

  useEffect(() => {
    const focusedReconId = searchParams.get("recon");
    if (!focusedReconId) {
      if (detailRecon) {
        setDetailRecon(null);
      }
      return;
    }

    const focusedRecon = reconciliations.find((recon) => recon.id === focusedReconId);
    if (focusedRecon && detailRecon?.id !== focusedRecon.id) {
      setDetailRecon(focusedRecon);
    }
  }, [detailRecon?.id, reconciliations, searchParams]);

  const updateReconQueryParam = useCallback(
    (reconId?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (reconId) {
        params.set("recon", reconId);
      } else {
        params.delete("recon");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openReconDetails = useCallback(
    (recon: InventoryReconciliation) => {
      setDetailRecon(recon);
      updateReconQueryParam(recon.id);
    },
    [updateReconQueryParam],
  );

  const closeReconDetails = useCallback(() => {
    updateReconQueryParam(null);
  }, [updateReconQueryParam]);

  const loadExistingDraft = async (branchId: string) => {
    const res = await fetch(
      `/api/admin/inventory/reconciliations?branch_id=${branchId}&status=draft`,
    );
    const json = await res.json();
    const recon = (json.data ?? [])[0] as InventoryReconciliation | undefined;
    if (recon) {
      setActiveRecon(recon);
      setLines(recon.inventory_reconciliation_lines ?? []);
    }
  };

  const startReconciliation = async () => {
    if (!selectedBranch) {
      toast.error("Select a branch.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/inventory/reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: selectedBranch }),
      });
      const json = await res.json();

      if (res.status === 409) {
        // Draft already exists — load it silently
        await loadExistingDraft(selectedBranch);
        toast.info("Loaded existing draft count for this branch.");
        return;
      }

      if (!res.ok) throw new Error(json.error ?? "Failed to create.");

      // Load the newly created reconciliation with lines
      const detailRes = await fetch(
        `/api/admin/inventory/reconciliations?branch_id=${selectedBranch}&status=draft`,
      );
      const detailJson = await detailRes.json();
      const recon = (detailJson.data ?? []).find(
        (r: InventoryReconciliation) => r.id === json.data.id,
      );
      if (recon) {
        setActiveRecon(recon);
        setLines(recon.inventory_reconciliation_lines ?? []);
      }
      toast.success("Reconciliation started.");
      fetchReconciliations();
    } catch (err: unknown) {
      toast.error("Failed to start reconciliation.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  const updateLine = (itemId: string, countedQty: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.inventory_item_id === itemId ? { ...l, counted_qty: countedQty } : l,
      ),
    );
  };

  const saveLines = async () => {
    if (!activeRecon) return;
    const res = await fetch(
      `/api/admin/inventory/reconciliations/${activeRecon.id}/lines`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({
            inventory_item_id: l.inventory_item_id,
            counted_qty: l.counted_qty,
            notes: l.notes,
          })),
        }),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      toast.error("Failed to save counts.", { description: json.error });
      return;
    }
    setLines(json.data ?? []);
    toast.success("Counts saved.");
  };

  const applyReconciliation = async () => {
    if (!activeRecon) return;
    if (
      !confirm(
        "Apply this reconciliation? Stock levels will be updated and this cannot be undone.",
      )
    )
      return;
    setApplying(true);
    try {
      await saveLines();
      const res = await fetch(
        `/api/admin/inventory/reconciliations/${activeRecon.id}/apply`,
        {
          method: "POST",
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to apply.");
      toast.success("Reconciliation applied. Stock levels updated.");
      setActiveRecon(null);
      setLines([]);
      fetchReconciliations();
    } catch (err: unknown) {
      toast.error("Failed to apply.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setApplying(false);
    }
  };

  const totalDelta = lines.reduce(
    (s, l) => s + Math.abs(l.counted_qty - l.system_qty),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Start new */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3">
          Start New Cycle Count
        </h3>
        <div className="flex gap-3">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[220px] border-gray-200">
              <SelectValue placeholder="Select branch..." />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={startReconciliation}
            disabled={creating || !selectedBranch}
            className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white"
          >
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Plus className="h-4 w-4 mr-2" />
            Start Count
          </Button>
        </div>
      </div>

      {/* Active reconciliation */}
      {activeRecon && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-amber-50 border-b border-amber-200">
            <div>
              <h3 className="font-semibold text-amber-900">
                Active Count —{" "}
                {branches.find((b) => b.id === activeRecon.branch_id)?.name}
              </h3>
              <p className="text-sm text-amber-700">
                {lines.length} items · {totalDelta} total delta units
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveLines}
                className="border-amber-300 text-amber-700"
              >
                Save Counts
              </Button>
              <Button
                size="sm"
                onClick={applyReconciliation}
                disabled={applying}
                className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white"
              >
                {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveRecon(null);
                  setLines([]);
                }}
                className="text-gray-500"
              >
                Discard
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-36" />
                <col className="w-24" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    System Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Counted Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Delta
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const delta = line.counted_qty - line.system_qty;
                  return (
                    <tr
                      key={line.inventory_item_id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium text-sm">
                        {line.inventory_items?.name ?? line.inventory_item_id}
                        {line.inventory_items?.sku && (
                          <span className="text-xs text-gray-400 ml-2">
                            {line.inventory_items.sku}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {line.system_qty}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={line.counted_qty}
                          onChange={(e) =>
                            updateLine(
                              line.inventory_item_id,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full border-gray-200 text-right h-8 text-sm"
                        />
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-mono font-medium text-sm",
                          delta > 0
                            ? "text-emerald-600"
                            : delta < 0
                              ? "text-rose-500"
                              : "text-gray-400",
                        )}
                      >
                        {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            Reconciliation History
          </h3>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Changes</TableHead>
              <TableHead>Applied At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-gray-400"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : reconciliations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <ClipboardList className="h-10 w-10 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      No reconciliations yet.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reconciliations.map((r) => {
                const lines = r.inventory_reconciliation_lines ?? [];
                const changedLines = lines.filter(
                  (l) => Number(l.delta_qty) !== 0,
                );
                const totalPositive = changedLines
                  .filter((l) => Number(l.delta_qty) > 0)
                  .reduce((s, l) => s + Number(l.delta_qty), 0);
                const totalNegative = changedLines
                  .filter((l) => Number(l.delta_qty) < 0)
                  .reduce((s, l) => s + Number(l.delta_qty), 0);

                return (
                  <TableRow
                    key={r.id}
                    className="hover:bg-[#FFF8F0]/40 cursor-pointer"
                    onClick={() => openReconDetails(r)}
                  >
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(r.created_at)}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {r.branches?.name ?? r.branch_id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          reconciliationStatusColor(r.status),
                        )}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {changedLines.length === 0 ? (
                        <span className="text-gray-400">
                          {lines.length} items · no changes
                        </span>
                      ) : (
                        <span className="text-gray-700">
                          {lines.length} items · {changedLines.length} adjusted
                          {totalPositive > 0 && (
                            <span className="text-emerald-600 font-medium ml-1">
                              +{totalPositive}
                            </span>
                          )}
                          {totalNegative < 0 && (
                            <span className="text-rose-500 font-medium ml-1">
                              {totalNegative}
                            </span>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-400">
                      {r.applied_at ? formatDate(r.applied_at) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ReconciliationDetailsDrawer
        reconciliation={detailRecon}
        open={!!detailRecon}
        onOpenChange={(o) => !o && closeReconDetails()}
        onApplied={() => {
          closeReconDetails();
          fetchReconciliations();
        }}
      />
    </div>
  );
}
