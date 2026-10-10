import Link from "next/link";
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


export async function ShopPreview() {
  const supabase = await createClient();

  const { data: dbProducts } = await supabase
    .from("products")
    .select(
      `id, name, slug, price_display, unit_price, price_value,
       currency, rating, images, description, is_featured,
       product_categories!inner(name, slug)`,
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3);

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
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-xs font-semibold uppercase tracking-widest mb-4">
            Shop
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-[#2C1A0E] mb-4">
            Shop Our Curated Collection
          </h2>
          <p className="text-[#6B4423]/70 font-light text-lg max-w-2xl">
            Maintain your glow at home with our premium selection of beauty
            products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#6B4423]/30 px-6 py-3 text-sm font-semibold text-[#6B4423] transition hover:border-[#6B4423] hover:bg-[#6B4423] hover:text-white"
          >
            Shop All Products &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
