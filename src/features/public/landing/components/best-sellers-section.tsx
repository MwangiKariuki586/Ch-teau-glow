import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/features/public/products/components/product-card";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_display: string;
  unit_price: number | null;
  price_value: number | null;
  currency: string | null;
  rating: number | null;
  images: string[] | null;
  description: string | null;
  is_featured: boolean | null;
  product_categories: { name: string; slug: string }[] | null;
};

export async function BestSellersSection() {
  let dbProducts: ProductRow[] = [];
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("products")
      .select(
        `
      id, name, slug, price_display, unit_price, price_value, currency, rating, images, description, is_featured,
      product_categories!inner(name, slug)
    `,
      )
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4);
    dbProducts = (data ?? []) as ProductRow[];
  } catch {
    // Build-time prerender without Supabase env, or DB unreachable:
    // render nothing instead of failing the whole page build.
    return null;
  }

  const products = ((dbProducts ?? []) as ProductRow[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.product_categories?.[0]?.name ?? "Skincare",
    priceDisplay: p.price_display,
    unitPrice: Number(p.unit_price ?? p.price_value ?? 0),
    currency: p.currency ?? "AED",
    description: p.description ?? "",
    rating: Number(p.rating),
    isFeatured: p.is_featured ?? false,
    image:
      p.images?.[0] ??
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=500&q=80",
    link: `/products/${p.slug}`,
  }));

  if (!products.length) return null;

  return (
    <section className="w-full bg-[#F9F7F4] py-10 sm:py-12 lg:py-16">
      <div className="px-4 sm:px-6 lg:px-13.75">
        {/* Header */}
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
            Shop Our Curated Collection
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-500 sm:text-base">
            Maintain your glow at home with our premium selection of beauty
            products.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View all */}
        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-[#6B4423] hover:text-[#6B4423] sm:px-6 sm:py-3"
          >
            Shop All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
