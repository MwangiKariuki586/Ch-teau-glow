"use client";

import { useState } from "react";
import { Loader2, Plus, CheckCircle2, XCircle } from "lucide-react";
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
  BranchStock,
  InventoryReconciliation,
  ReconciliationLine,
} from "../types";
import { reconciliationStatusColor, formatDate } from "../utils";

interface Props {
  itemId: string;
  branchStock: BranchStock[];
  reconciliations: InventoryReconciliation[];
  prefillBranchId: string | null;
  onRefresh: () => void;
}

export function ReconciliationPanel({
  itemId,
  branchStock,
  reconciliations,
  prefillBranchId,
  onRefresh,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(
    prefillBranchId ?? "",
  );
  const [activeRecon, setActiveRecon] =
    useState<InventoryReconciliation | null>(null);
  const [lines, setLines] = useState<ReconciliationLine[]>([]);
  const [applying, setApplying] = useState(false);
  const [loadingRecon, setLoadingRecon] = useState(false);

  const startReconciliation = async () => {
    if (!selectedBranchId) {
      toast.error("Select a branch to reconcile.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/inventory/reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          inventory_item_id: itemId ?? null,
        }),
      });
      const json = await res.json();

      // If a draft already exists, load it instead of creating a new one
      if (res.status === 409) {
        toast.info("Loaded existing draft count for this branch.");
        const linesRes = await fetch(
          `/api/admin/inventory/reconciliations?branch_id=${selectedBranchId}&status=draft`,
        );
        const linesJson = await linesRes.json();
        const recon = (linesJson.data ?? [])[0] as
          | InventoryReconciliation
          | undefined;
        if (recon) {
          setActiveRecon(recon);
          setLines(recon.inventory_reconciliation_lines ?? []);
        }
        return;
      }

      if (!res.ok)
        throw new Error(json.error ?? "Failed to create reconciliation.");

      // Load the newly created reconciliation with its lines
      setLoadingRecon(true);
      const linesRes = await fetch(
        `/api/admin/inventory/reconciliations?branch_id=${selectedBranchId}&status=draft`,
      );
      const linesJson = await linesRes.json();
      const recon = (linesJson.data ?? []).find(
        (r: InventoryReconciliation) => r.id === json.data.id,
      );
      if (recon) {
        setActiveRecon(recon);
        setLines(recon.inventory_reconciliation_lines ?? []);
      }
      toast.success("Reconciliation started.");
      onRefresh();
    } catch (err: unknown) {
      toast.error("Failed to start reconciliation.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
      setLoadingRecon(false);
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
        "Apply this reconciliation? This will update stock levels and cannot be undone.",
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
      onRefresh();
    } catch (err: unknown) {
      toast.error("Failed to apply reconciliation.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Start new reconciliation */}
      {!activeRecon && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            Start Cycle Count
          </h3>
          <div className="flex gap-3">
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
            >
              <SelectTrigger className="w-[220px] border-gray-200">
                <SelectValue placeholder="Select branch..." />
              </SelectTrigger>
              <SelectContent>
                {branchStock.map((bs) => (
                  <SelectItem key={bs.branch_id} value={bs.branch_id}>
                    {bs.branch?.name ?? bs.branch_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={startReconciliation}
              disabled={creating || !selectedBranchId}
              className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white"
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Plus className="h-4 w-4 mr-2" />
              Start Count
            </Button>
          </div>
        </div>
      )}

      {/* Active reconciliation */}
      {activeRecon && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-amber-50 border-b border-amber-200">
            <div>
              <h3 className="font-semibold text-amber-900">
                Active Cycle Count
              </h3>
              <p className="text-sm text-amber-700">
                Enter counted quantities below, then apply.
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
                <XCircle className="h-4 w-4" />
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
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            Reconciliation History
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lines</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reconciliations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-gray-400"
                >
                  No reconciliations yet.
                </TableCell>
              </TableRow>
            ) : (
              reconciliations.map((r) => (
                <TableRow key={r.id} className="hover:bg-[#FFF8F0]/40">
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
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
                  <TableCell className="text-sm text-gray-500">
                    {r.inventory_reconciliation_lines?.length ?? 0} items
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
