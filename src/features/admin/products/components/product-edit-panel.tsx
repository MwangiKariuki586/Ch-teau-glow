"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ProductWithRelations, CategoryOption, BranchOption } from "../types";
import { ProductForm } from "./product-form";

export function ProductEditPanel({
  product,
  categories,
  branches,
  onClose,
  onSuccess,
}: {
  product: ProductWithRelations | null;
  categories: CategoryOption[];
  branches: BranchOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Edit Product</h2>
          {product && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground max-w-[220px]">
              {product.name}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Close edit panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable form */}
      <ScrollArea className="h-full flex-1 min-h-0">
        <div className="p-5">
          {product ? (
            <ProductForm
              initialData={product}
              categories={categories}
              branches={branches}
              onSuccess={onSuccess}
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No product selected.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
