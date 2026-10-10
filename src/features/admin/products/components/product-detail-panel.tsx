"use client";

import { useState } from "react";
import { Loader2, Package, Pencil, Star, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ProductWithRelations } from "../types";
import { getCategoryName, getBranchName } from "../hooks/use-products-queue";

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ProductDetailPanel({
  product,
  pendingAction,
  isEditing,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  product: ProductWithRelations | null;
  pendingAction: string | null;
  isEditing: boolean;
  onEdit: (productId: string) => void;
  onToggleStatus: (productId: string, currentStatus: boolean) => void;
  onDelete: (productId: string, name: string) => void;
}) {
  if (!product) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-base font-medium text-foreground">Select a product</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Click any product from the list to view its details and available actions.
        </p>
      </div>
    );
  }

  const isStatusBusy = pendingAction === `${product.id}:status`;
  const isDeleteBusy = pendingAction === `${product.id}:delete`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-100 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{product.name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{getCategoryName(product)}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              product.is_active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-gray-100 text-gray-500",
            )}
          >
            {product.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="h-full flex-1 min-h-0">
        <div className="space-y-4 p-6">
          {/* Images */}
          {product.images?.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {product.images.slice(0, 6).map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl border border-gray-100"
                >
                  <img src={url} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Core info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Price" value={product.price_display} />
              <DetailRow label="Branch" value={getBranchName(product)} />
              <DetailRow label="Currency" value={product.currency} />
              {product.rating > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rating</p>
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#C9A96E] text-[#C9A96E]" />
                    <span className="text-sm text-foreground">{product.rating}</span>
                  </div>
                </div>
              )}
              <DetailRow label="Slug" value={product.slug} />
              {product.is_featured && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Featured</p>
                  <p className="mt-1 text-sm text-[#6B4423]">⭐ Featured product</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-foreground">Description</h3>
              <Separator />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Status toggle */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">
                  {product.is_active ? "Visible on the public site" : "Hidden from the public site"}
                </p>
              </div>
              <Switch
                checked={product.is_active}
                onCheckedChange={() => onToggleStatus(product.id, product.is_active)}
                disabled={isStatusBusy}
                aria-label="Toggle product active state"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action footer */}
      <div className="shrink-0 border-t border-gray-100 px-6 py-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className={cn(
              "transition-colors",
              isEditing
                ? "bg-[#C9A96E] text-[#3E2723] hover:bg-[#b8924f]"
                : "bg-[#3E2723] text-white hover:bg-[#52342d]",
            )}
            onClick={() => onEdit(product.id)}
          >
            <Pencil className="h-4 w-4" />
            {isEditing ? "Editing…" : "Edit"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleteBusy}
                className="ml-auto text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                {isDeleteBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete product?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium text-foreground">{product.name}</span> will be
                  permanently removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(product.id, product.name)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
