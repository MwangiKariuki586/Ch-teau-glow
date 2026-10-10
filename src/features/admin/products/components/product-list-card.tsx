"use client";

import { Package, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductWithRelations } from "../types";
import { getCategoryName } from "../hooks/use-products-queue";

export function ProductListCard({
  product,
  isSelected,
  onClick,
}: {
  product: ProductWithRelations;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-200",
        "hover:bg-[#FFF8F0]",
        isSelected
          ? "bg-[#FFF4E2] border-l-2 border-l-[#C9A96E]"
          : "border-l-2 border-l-transparent",
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-medium text-foreground leading-snug">
            {product.name}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              product.is_active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-gray-100 text-gray-500",
            )}
          >
            {product.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {getCategoryName(product)}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{product.price_display}</span>
          {product.rating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-[#C9A96E] text-[#C9A96E]" />
              {product.rating}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
