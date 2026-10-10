"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/features/public/products/hooks/use-cart";
import { toast } from "sonner";

export interface ProductCardItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceDisplay: string;
  unitPrice: number;
  currency: string;
  description?: string;
  rating: number;
  reviewCount?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  image: string;
  link: string;
}

export function ProductCard({ product }: { product: ProductCardItem }) {
  const inStock = product.inStock !== false;
  const { addItem } = useCart();

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      unitPrice: product.unitPrice,
      priceDisplay: product.priceDisplay,
      currency: product.currency,
    });
    toast.success(`${product.name} added to cart`);
  }

  return (
    <article className="group h-full overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      <Link href={product.link}>
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-full">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-col p-4 sm:p-5">
        {/* Category */}
        <p className="mb-1 text-xs uppercase tracking-wider text-gray-400">
          {product.category}
        </p>

        {/* Name */}
        <Link href={product.link}>
          <h3 className="mb-2 line-clamp-1 text-sm font-serif leading-snug text-gray-900 transition-colors group-hover:text-[#6B4423] sm:text-base">
            {product.name}
          </h3>
        </Link>

        {/* Description — 2 lines */}
        {product.description && (
          <p className="mb-3 line-clamp-2 text-xs font-light leading-relaxed text-gray-500 sm:mb-4">
            {product.description}
          </p>
        )}

        {/* Price + cart */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-medium text-[#C9A96E] sm:text-lg">
            {product.priceDisplay}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            aria-label={`Add ${product.name} to cart`}
            className={cn(
              "rounded-xl p-2 transition-all duration-200 sm:p-2.5",
              inStock
                ? "bg-[#6B4423]/5 text-[#6B4423] hover:bg-[#6B4423] hover:text-white"
                : "bg-gray-100 text-gray-300 cursor-not-allowed",
            )}
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
