"use client";

import {
  ChevronDown,
  Loader2,
  Package,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useProductsQueue, type StatusFilter } from "../hooks/use-products-queue";
import { ProductListCard } from "./product-list-card";
import { ProductDetailPanel } from "./product-detail-panel";
import { ProductEditPanel } from "./product-edit-panel";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All statuses",
  active: "Active",
  inactive: "Inactive",
};

export function ProductsSplitView() {
  const queue = useProductsQueue();

  const selectedProduct =
    queue.selectedProductId
      ? queue.allProducts.find((p) => p.id === queue.selectedProductId) ?? null
      : null;

  const editProduct = queue.editProductId
    ? queue.allProducts.find((p) => p.id === queue.editProductId) ?? null
    : null;

  const isEditing = Boolean(queue.editProductId);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        {/* Page header */}
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Product Catalogue
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage retail products available across Château Glow branches.
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={queue.triggerReload}
                disabled={queue.refreshing}
                className="gap-2 rounded-xl border-gray-200 bg-white shadow-sm"
              >
                {queue.refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reload the product catalogue</TooltipContent>
          </Tooltip>
        </div>

        {/* Three-column panel */}
        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">

          {/* ── Col 1: List ── */}
          <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm min-h-0 xl:w-80">
            {/* Toolbar */}
            <div className="shrink-0 space-y-2 border-b border-gray-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queue.search}
                  onChange={(e) => queue.setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="rounded-xl border-gray-200 bg-gray-50 pl-9 text-sm h-9"
                />
                {queue.search && (
                  <button
                    type="button"
                    onClick={() => queue.setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 flex-1 justify-between gap-1 rounded-lg border-gray-200 text-xs font-normal",
                        queue.statusFilter !== "all" && "border-[#C9A96E] bg-[#FFF4E2] text-[#6B4423]",
                      )}
                    >
                      <span className="truncate">{STATUS_LABELS[queue.statusFilter]}</span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => queue.setStatusFilter(s)}
                        className={cn("text-sm", queue.statusFilter === s && "font-medium text-[#6B4423]")}
                      >
                        {STATUS_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 flex-1 justify-between gap-1 rounded-lg border-gray-200 text-xs font-normal",
                        queue.categoryFilter !== "all" && "border-[#C9A96E] bg-[#FFF4E2] text-[#6B4423]",
                      )}
                    >
                      <span className="truncate">
                        {queue.categoryFilter === "all"
                          ? "All categories"
                          : (queue.categories.find((c) => c.id === queue.categoryFilter)?.name ?? "Category")}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onClick={() => queue.setCategoryFilter("all")}
                      className={cn("text-sm", queue.categoryFilter === "all" && "font-medium text-[#6B4423]")}
                    >
                      All categories
                    </DropdownMenuItem>
                    {queue.categories.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => queue.setCategoryFilter(c.id)}
                        className={cn("text-sm", queue.categoryFilter === c.id && "font-medium text-[#6B4423]")}
                      >
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="px-1 text-[11px] text-muted-foreground">
                {queue.products.length} product{queue.products.length !== 1 ? "s" : ""}
              </p>
            </div>

            <ScrollArea className="h-full flex-1 min-h-0">
              {queue.loading ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Loading products…</p>
                </div>
              ) : queue.error ? (
                <div className="p-4">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    {queue.error}
                  </div>
                </div>
              ) : queue.products.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">No products found</p>
                  <p className="text-xs text-muted-foreground">Adjust filters or add a product via Inventory.</p>
                </div>
              ) : (
                <div className={cn("relative", queue.refreshing && "pointer-events-none")}>
                  {queue.refreshing && (
                    <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/60 pt-8">
                      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Updating…</span>
                      </div>
                    </div>
                  )}
                  {queue.products.map((product) => (
                    <ProductListCard
                      key={product.id}
                      product={product}
                      isSelected={queue.selectedProductId === product.id}
                      onClick={() => {
                        queue.setSelectedProductId(product.id);
                        // Close edit panel when switching products
                        if (queue.editProductId && queue.editProductId !== product.id) {
                          queue.setEditProductId(null);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ── Col 2: Detail/View ── */}
          <div
            className={cn(
              "flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm min-h-0 overflow-hidden transition-all duration-300 ease-in-out",
              isEditing ? "w-72 shrink-0 xl:w-80" : "flex-1 min-w-0",
            )}
          >
            <ProductDetailPanel
              product={selectedProduct}
              pendingAction={queue.pendingAction}
              isEditing={isEditing}
              onEdit={(id) => queue.setEditProductId(id)}
              onToggleStatus={queue.toggleStatus}
              onDelete={queue.deleteProduct}
            />
          </div>

          {/* ── Col 3: Edit form — slides in ── */}
          <div
            className={cn(
              "flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm min-h-0 overflow-hidden transition-all duration-300 ease-in-out",
              isEditing
                ? "flex-1 min-w-0 opacity-100"
                : "w-0 opacity-0 border-0 shadow-none pointer-events-none",
            )}
          >
            {isEditing && (
              <ProductEditPanel
                product={editProduct}
                categories={queue.categories}
                branches={queue.branches}
                onClose={() => queue.setEditProductId(null)}
                onSuccess={() => {
                  queue.setEditProductId(null);
                  queue.triggerReload();
                }}
              />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
