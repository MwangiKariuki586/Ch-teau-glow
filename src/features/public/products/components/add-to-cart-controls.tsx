'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/features/public/products/hooks/use-cart';
import { toast } from 'sonner';

interface AddToCartControlsProps {
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

export function AddToCartControls({ product }: AddToCartControlsProps) {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  function handleAdd() {
    addItem(
      {
        productId: product.productId,
        name: product.name,
        slug: product.slug,
        image: product.image,
        unitPrice: product.unitPrice,
        priceDisplay: product.priceDisplay,
        currency: product.currency,
      },
      qty,
    );
    toast.success(`${qty}× ${product.name} added to cart`);
  }

  return (
    <div className="flex items-center gap-4">
      {/* Quantity Controls */}
      <div className="flex items-center bg-gray-100 rounded-full p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full hover:bg-white"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="px-6 py-2 text-center min-w-[3rem] font-medium text-lg select-none">
          {qty}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full hover:bg-white"
          onClick={() => setQty((q) => q + 1)}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Add to Cart Button */}
      <Button
        size="lg"
        onClick={handleAdd}
        className="flex-1 rounded-full bg-gradient-to-r from-[#6B4423] to-[#8B5A2B] text-white hover:from-[#5A3A1D] hover:to-[#6B4423] py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        Add To Cart
      </Button>
    </div>
  );
}
