"use client";

import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/public/products/hooks/use-cart";

interface ShopAddToCartButtonProps {
  product: {
    productId: string;
    name: string;
    slug: string;
    image: string;
    unitPrice: number;
    priceDisplay: string;
    currency: string;
  };
}

export function ShopAddToCartButton({ product }: ShopAddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <Button
      size="lg"
      className="w-full rounded-full bg-[#6B4423] py-5 sm:py-7 text-base sm:text-lg font-bold shadow-md hover:bg-[#4A2C1A] hover:shadow-lg transition-all active:scale-[0.98]"
      onClick={() => {
        addItem(product);
        toast.success(`${product.name} added to cart`);
      }}
    >
      <ShoppingCart className="mr-2 sm:mr-3 h-5 w-5" />
      Add to Cart
    </Button>
  );
}
