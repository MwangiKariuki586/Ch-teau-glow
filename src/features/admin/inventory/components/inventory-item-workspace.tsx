"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Edit2,
  Loader2,
  AlertTriangle,
  ArrowRightLeft,
  ClipboardList,
  PackagePlus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  BranchStock,
  InventoryMovement,
  InventoryReconciliation,
} from "../types";
import {
  formatMovementType,
  movementTypeColor,
  formatDate,
  formatDelta,
  reconciliationStatusColor,
} from "../utils";
import { AdjustStockDrawer } from "./adjust-stock-drawer";
import { CreateTransferDrawer } from "./create-transfer-drawer";
import { ReconciliationPanel } from "./reconciliation-panel";
import { ReceiveStockDrawer } from "./receive-stock-drawer";

type Tab = "overview" | "branch_stock" | "movements" | "reconciliation";

interface ItemDetailResponse {
  data: {
    item: InventoryItem;
    branch_stock: BranchStock[];
    movements: InventoryMovement[];
    product: { id: string; name: string; slug: string } | null;
  };
}

interface Props {
  itemId: string;
}

export function InventoryItemWorkspace({ itemId }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<ItemDetailResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<BranchStock | null>(null);
  const [transferTarget, setTransferTarget] = useState<BranchStock | null>(
    null,
  );
  const [receiveTarget, setReceiveTarget] = useState<BranchStock | null>(null);
  const [reconBranch, setReconBranch] = useState<BranchStock | null>(null);
  const [reconciliations, setReconciliations] = useState<
    InventoryReconciliation[]
  >([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/items/${itemId}`);
      const json: ItemDetailResponse = await res.json();
      setData(json.data);
    } catch {
      toast.error("Failed to load item details.");
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  const fetchReconciliations = useCallback(async () => {
    const res = await fetch(
      `/api/admin/inventory/reconciliations?item_id=${itemId}`,
    );
    const json = await res.json();
    setReconciliations(json.data ?? []);
  }, [itemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab === "reconciliation") fetchReconciliations();
  }, [tab, fetchReconciliations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B4423]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24 text-gray-500">
        Item not found.{" "}
        <Link href="/admin/inventory" className="text-[#6B4423] underline">
          Back to inventory
        </Link>
      </div>
    );
  }

  const { item, branch_stock, movements, product } = data;
  const totalOnHand = branch_stock.reduce((s, b) => s + Number(b.on_hand), 0);
  const lowStockBranches = branch_stock.filter(
    (b) => Number(b.on_hand) <= Number(b.low_stock_threshold),
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "branch_stock", label: "Branch Stock" },
    { id: "movements", label: "Movements" },
    { id: "reconciliation", label: "Reconciliation" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="text-gray-500">
            <Link href="/admin/inventory">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {item.sku ? `SKU: ${item.sku} · ` : ""}
              {item.item_type === "retail_product"
                ? "Retail Product"
                : "Consumable"}{" "}
              · {item.unit}
            </p>
            {product && (
              <Link
                href={`/admin/products/${product.id}`}
                className="mt-2 inline-flex text-sm font-medium text-[#6B4423] underline"
              >
                Open linked product
              </Link>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            item.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-100 text-gray-500 border-gray-200",
          )}
        >
          {item.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-[#6B4423] text-[#6B4423]"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total On Hand</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalOnHand}{" "}
              <span className="text-base font-normal text-gray-400">
                {item.unit}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Branches Stocked</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {branch_stock.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Low Stock Branches</p>
            <p
              className={cn(
                "text-3xl font-bold mt-1",
                lowStockBranches.length > 0
                  ? "text-amber-600"
                  : "text-gray-900",
              )}
            >
              {lowStockBranches.length}
            </p>
          </div>
        </div>
      )}

      {/* Tab: Branch Stock */}
      {tab === "branch_stock" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branch_stock.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-gray-400"
                  >
                    No branch stock records yet.
                  </TableCell>
                </TableRow>
              ) : (
                branch_stock.map((bs) => {
                  const isLow =
                    Number(bs.on_hand) <= Number(bs.low_stock_threshold);
                  const isOut = Number(bs.on_hand) === 0;
                  return (
                    <TableRow
                      key={bs.branch_id}
                      className="hover:bg-[#FFF8F0]/40"
                    >
                      <TableCell className="font-medium">
                        {bs.branch?.name ?? bs.branch_id}
                        {bs.branch?.city && (
                          <span className="text-gray-400 text-xs ml-1">
                            · {bs.branch.city}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(bs.on_hand)} {item.unit}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {Number(bs.low_stock_threshold)}
                      </TableCell>
                      <TableCell>
                        {isOut ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200 text-xs"
                          >
                            Out of Stock
                          </Badge>
                        ) : isLow ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                          >
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceiveTarget(bs)}
                            className="text-xs border-gray-200"
                          >
                            <PackagePlus className="h-3.5 w-3.5 mr-1" />
                            Receive
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdjustTarget(bs)}
                            className="text-xs border-gray-200"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Adjust
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTransferTarget(bs)}
                            className="text-xs border-gray-200"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                            Transfer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReconBranch(bs);
                              setTab("reconciliation");
                              fetchReconciliations();
                            }}
                            className="text-xs border-gray-200"
                          >
                            <ClipboardList className="h-3.5 w-3.5 mr-1" />
                            Count
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab: Movements */}
      {tab === "movements" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Delta</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-gray-400"
                  >
                    No movements recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id} className="hover:bg-[#FFF8F0]/40">
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          movementTypeColor(m.movement_type),
                        )}
                      >
                        {formatMovementType(m.movement_type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{m.branch_id}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-medium text-sm",
                        Number(m.quantity_delta) > 0
                          ? "text-emerald-600"
                          : "text-rose-500",
                      )}
                    >
                      {formatDelta(Number(m.quantity_delta), item.unit)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {m.reason_code ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-400 max-w-[200px] truncate">
                      {m.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab: Reconciliation */}
      {tab === "reconciliation" && (
        <ReconciliationPanel
          itemId={itemId}
          branchStock={branch_stock}
          reconciliations={reconciliations}
          prefillBranchId={reconBranch?.branch_id ?? null}
          onRefresh={() => {
            fetchData();
            fetchReconciliations();
          }}
        />
      )}

      {/* Drawers */}
      {adjustTarget && (
        <AdjustStockDrawer
          open={!!adjustTarget}
          onOpenChange={(o) => !o && setAdjustTarget(null)}
          onAdjusted={() => {
            setAdjustTarget(null);
            fetchData();
          }}
          branchId={adjustTarget.branch_id}
          branchName={adjustTarget.branch?.name ?? adjustTarget.branch_id}
          inventoryItemId={item.id}
          itemName={item.name}
          currentOnHand={Number(adjustTarget.on_hand)}
          unit={item.unit}
        />
      )}

      {receiveTarget && (
        <ReceiveStockDrawer
          open={!!receiveTarget}
          onOpenChange={(o) => !o && setReceiveTarget(null)}
          onReceived={() => {
            setReceiveTarget(null);
            fetchData();
          }}
          inventoryItemId={item.id}
          itemName={item.name}
          branchId={receiveTarget.branch_id}
          branchName={receiveTarget.branch?.name ?? receiveTarget.branch_id}
          unit={item.unit}
        />
      )}

      <CreateTransferDrawer
        open={!!transferTarget}
        onOpenChange={(o) => !o && setTransferTarget(null)}
        onCreated={() => {
          setTransferTarget(null);
          fetchData();
        }}
        prefillFromBranchId={transferTarget?.branch_id}
        prefillFromBranchName={transferTarget?.branch?.name}
        prefillItemId={item.id}
        prefillItemName={item.name}
      />
    </div>
  );
}
