"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  XOctagon,
  Edit2,
  ArrowRightLeft,
  ExternalLink,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LowStockRow, Branch } from "../types";
import { AdjustStockDrawer } from "./adjust-stock-drawer";
import { CreateTransferDrawer } from "./create-transfer-drawer";

interface Props {
  initialData: LowStockRow[];
  branches: Branch[];
}

export function LowStockDashboard({ initialData, branches }: Props) {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<LowStockRow[]>(initialData);
  const [branchFilter, setBranchFilter] = useState(() => searchParams.get("branch") ?? "all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [adjustTarget, setAdjustTarget] = useState<LowStockRow | null>(null);
  const [transferTarget, setTransferTarget] = useState<LowStockRow | null>(
    null,
  );

  const filtered = rows.filter((r) => {
    if (branchFilter !== "all" && r.branch_id !== branchFilter) return false;
    if (typeFilter !== "all" && r.item?.item_type !== typeFilter) return false;
    return true;
  });

  const outOfStock = filtered.filter((r) => r.severity === "out_of_stock");
  const lowStock = filtered.filter((r) => r.severity === "low_stock");

  const refetch = useCallback(async () => {
    const params = new URLSearchParams();
    if (branchFilter !== "all") params.set("branch_id", branchFilter);
    const res = await fetch(`/api/admin/inventory/low-stock?${params}`);
    const json = await res.json();
    setRows(json.data ?? []);
  }, [branchFilter]);

  useEffect(() => {
    const nextBranch = searchParams.get("branch") ?? "all";
    if (nextBranch !== branchFilter) {
      setBranchFilter(nextBranch);
    }
  }, [branchFilter, searchParams]);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <XOctagon className="h-5 w-5 text-red-500" />
            <p className="text-sm text-gray-500">Out of Stock</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{outOfStock.length}</p>
          <p className="text-xs text-gray-400 mt-1">branch-item combinations</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-gray-500">Low Stock</p>
          </div>
          <p className="text-3xl font-bold text-amber-600">{lowStock.length}</p>
          <p className="text-xs text-gray-400 mt-1">branch-item combinations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[180px] border-gray-200">
            <Filter className="h-4 w-4 mr-2 text-gray-400" />
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] border-gray-200">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="retail_product">Retail</SelectItem>
            <SelectItem value="consumable">Consumable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead>Severity</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertTriangle className="h-12 w-12 text-gray-300" />
                    <p className="text-base font-medium text-gray-700">
                      All stocked up
                    </p>
                    <p className="text-sm text-gray-400">
                      No low-stock items for the selected filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={`${row.branch_id}-${row.inventory_item_id}`}
                  className="hover:bg-[#FFF8F0]/40"
                >
                  <TableCell>
                    {row.severity === "out_of_stock" ? (
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-600 border-red-200 text-xs gap-1"
                      >
                        <XOctagon className="h-3 w-3" />
                        Out of Stock
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 text-xs gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {row.item?.name ?? row.inventory_item_id}
                      </p>
                      {row.item?.sku && (
                        <p className="text-xs text-gray-400">{row.item.sku}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.branch?.name ?? row.branch_id}
                    {row.branch?.city && (
                      <span className="text-gray-400 text-xs ml-1">
                        · {row.branch.city}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-bold",
                      row.severity === "out_of_stock"
                        ? "text-red-600"
                        : "text-amber-600",
                    )}
                  >
                    {row.on_hand}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      {row.item?.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-gray-500 text-sm">
                    {row.low_stock_threshold}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdjustTarget(row)}
                        className="text-xs border-gray-200"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        Adjust
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTransferTarget(row)}
                        className="text-xs border-gray-200"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                        Transfer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs text-gray-400"
                      >
                        <Link
                          href={`/admin/inventory/items/${row.inventory_item_id}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Adjust drawer */}
      {adjustTarget && (
        <AdjustStockDrawer
          open={!!adjustTarget}
          onOpenChange={(o) => !o && setAdjustTarget(null)}
          onAdjusted={() => {
            setAdjustTarget(null);
            refetch();
          }}
          branchId={adjustTarget.branch_id}
          branchName={adjustTarget.branch?.name ?? adjustTarget.branch_id}
          inventoryItemId={adjustTarget.inventory_item_id}
          itemName={adjustTarget.item?.name ?? adjustTarget.inventory_item_id}
          currentOnHand={adjustTarget.on_hand}
          unit={adjustTarget.item?.unit ?? "unit"}
        />
      )}

      {/* Transfer drawer */}
      {transferTarget && (
        <CreateTransferDrawer
          open={!!transferTarget}
          onOpenChange={(o) => !o && setTransferTarget(null)}
          onCreated={() => {
            setTransferTarget(null);
            refetch();
          }}
          prefillFromBranchId={transferTarget.branch_id}
          prefillFromBranchName={transferTarget.branch?.name}
          prefillItemId={transferTarget.inventory_item_id}
          prefillItemName={transferTarget.item?.name}
        />
      )}
    </div>
  );
}
