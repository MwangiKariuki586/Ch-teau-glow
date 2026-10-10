"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, Plus, Boxes, AlertTriangle } from "lucide-react";
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
import type { CreateAssetType, InventoryItem } from "../types";
import { CreateItemDrawer } from "./create-item-drawer";

interface ListResponse {
  data: InventoryItem[];
  total: number;
  totalPages: number;
  page: number;
}

export function InventoryList({ branchId = "all" }: { branchId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const requestedCreateType = searchParams.get("create");
  const initialCreateType: CreateAssetType =
    requestedCreateType === "retail" ? "retail_product" : "consumable";

  // Reset page when branch changes externally
  useEffect(() => {
    setPage(1);
  }, [branchId]);

  useEffect(() => {
    if (requestedCreateType === "retail" || requestedCreateType === "consumable") {
      setCreateOpen(true);
    }
  }, [requestedCreateType]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        item_type: itemType,
        ...(search && { q: search }),
        ...(branchId !== "all" && { branch_id: branchId }),
        ...(activeOnly && { active_only: "true" }),
        ...(lowStockOnly && { low_stock_only: "true" }),
      });
      const res = await fetch(`/api/admin/inventory/items?${params}`);
      const json: ListResponse = await res.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, itemType, branchId, activeOnly, lowStockOnly]);

  useEffect(() => {
    const t = setTimeout(fetchItems, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchItems, search]);

  const kpis = [
    { label: "Total Assets", value: total, color: "text-gray-900" },
    {
      label: "Active",
      value: items.filter((i) => i.is_active).length,
      color: "text-emerald-600",
    },
    {
      label: "Low Stock",
      value: items.filter((i) => (i.low_stock_branches ?? 0) > 0).length,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={cn("text-3xl font-bold mt-1", card.color)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search assets..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 border-gray-200"
              />
            </div>
            <Select
              value={itemType}
              onValueChange={(v) => {
                setItemType(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] border-gray-200">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="retail_product">Retail Product</SelectItem>
                <SelectItem value="consumable">Consumable</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setLowStockOnly(!lowStockOnly);
                setPage(1);
              }}
              className={cn(
                "border-gray-200 gap-2",
                lowStockOnly && "bg-amber-50 border-amber-300 text-amber-700",
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActiveOnly(!activeOnly);
                setPage(1);
              }}
              className={cn(
                "border-gray-200",
                activeOnly &&
                  "bg-emerald-50 border-emerald-300 text-emerald-700",
              )}
            >
              Active Only
            </Button>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead>Item Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">
                  {branchId === "all" ? "Total On Hand" : "On Hand"}
                </TableHead>
                <TableHead className="text-right">Low Stock Branches</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-16 text-center text-gray-400"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Boxes className="h-12 w-12 text-gray-300" />
                      <p className="text-base font-medium text-gray-700">
                        No assets found
                      </p>
                      <p className="text-sm text-gray-400">
                        {branchId === "all"
                          ? "Add a retail product or consumable to get started."
                          : "No items stocked at this branch yet."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-[#FFF8F0]/40 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(`/admin/inventory/items/${item.id}`)
                    }
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {item.sku ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          item.item_type === "retail_product"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200",
                        )}
                      >
                        {item.item_type === "retail_product"
                          ? "Retail"
                          : "Consumable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.total_on_hand ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {(item.low_stock_branches ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium text-sm">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {item.low_stock_branches}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of{" "}
              {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateItemDrawer
        open={createOpen}
        initialItemType={initialCreateType}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && requestedCreateType) {
            router.replace(pathname);
          }
        }}
        onCreated={() => {
          setCreateOpen(false);
          fetchItems();
          if (requestedCreateType) {
            router.replace(pathname);
          }
        }}
      />
    </div>
  );
}
