"use client";

import Link from "next/link";
import { Product } from "../data/mockData";
import { ShoppingBagIcon } from "lucide-react";

// Map product IDs to available brand images
const productImages: Record<string, string> = {
  pr1: "/slide1.png",
  pr2: "/slide2.png",
  pr3: "/service_marketplace_hero_3.jpg",
  pr4: "/service_marketplace_hero_1.jpg",
};

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const image = productImages[product.id];
  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-[#6B4423]/10 overflow-hidden hover:shadow-lg transition-all duration-300">
      <Link
        href={`/products/${product.id}`}
        className="h-64 w-full relative block overflow-hidden bg-[#F9F5F0]"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-[#6B4423]/10" />
        )}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-[#6B4423]">
          {product.category}
        </div>
      </Link>

      <div className="p-6 flex flex-col flex-grow">
        <Link href={`/products/${product.id}`} className="block mb-1">
          <h3 className="text-lg font-serif text-[#2C1A0E] group-hover:text-[#6B4423] transition-colors">
            {product.name}
          </h3>
        </Link>
        <span className="text-[#6B4423] font-semibold mb-3">
          AED {product.price}
        </span>

        <p className="text-sm text-[#6B4423]/60 font-light line-clamp-2 mb-6 flex-grow">
          {product.description}
        </p>

        <button className="w-full flex items-center justify-center bg-[#F9F5F0] text-[#6B4423] py-3 rounded-xl text-sm font-medium hover:bg-[#6B4423] hover:text-white transition-colors mt-auto">
          <ShoppingBagIcon className="w-4 h-4 mr-2" />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
