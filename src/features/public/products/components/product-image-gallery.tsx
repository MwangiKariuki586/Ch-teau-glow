'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Heart, Bookmark, Award } from 'lucide-react';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  isFeatured?: boolean;
}

export function ProductImageGallery({ images, productName, isFeatured }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-6">
      {/* Main Image */}
      <div className="group relative aspect-square overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-100 cursor-zoom-in">
        <Image
          src={images[activeIndex]}
          alt={productName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          priority
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {isFeatured && (
          <div className="absolute left-6 top-6">
            <Badge className="bg-gradient-to-r from-[#6B4423] to-[#8B5A2B] text-white shadow-lg">
              <Award className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute right-6 top-6 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full bg-white/90 shadow-lg backdrop-blur-sm hover:bg-white">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full bg-white/90 shadow-lg backdrop-blur-sm hover:bg-white hover:text-red-500">
            <Heart className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full bg-white/90 shadow-lg backdrop-blur-sm hover:bg-white hover:text-[#6B4423]">
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'relative aspect-square rounded-xl overflow-hidden ring-2 transition-all',
                activeIndex === idx
                  ? 'ring-[#6B4423] opacity-100'
                  : 'ring-transparent opacity-70 hover:opacity-100 hover:ring-[#6B4423]/50'
              )}
            >
              <Image
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
