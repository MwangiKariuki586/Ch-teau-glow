'use client';

import { useState, useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { ProductCard, type ProductCardItem } from './product-card';
import { cn } from '@/lib/utils';

interface ProductsClientShellProps {
  products: ProductCardItem[];
  categories: string[];
}

export function ProductsClientShell({ products, categories }: ProductsClientShellProps) {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === 'All' || p.category === activeCategory;
      return matchCat;
    });
  }, [products, activeCategory]);

  return (
    <>
      {/* Category tabs */}
      <section className="bg-[#F9F5F0] py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-wrap justify-center gap-3">
            {['All', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-6 py-2.5 rounded-full text-sm font-medium transition-colors',
                  activeCategory === cat
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-12 bg-[#F9F5F0]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                <ShoppingCart className="h-8 w-8 text-stone-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-stone-900">No products found</h3>
              <p className="text-stone-500">Try a different category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
