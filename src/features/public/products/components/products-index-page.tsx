import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ProductsClientShell } from './products-client-shell';

export async function ProductsIndexPage() {
    const supabase = await createClient();

    const { data: dbProducts, error } = await supabase
        .from('products')
        .select(`
      id,
      name,
      slug,
      price_display,
      unit_price,
      price_value,
      currency,
      rating,
      images,
      description,
      is_featured,
      product_categories!inner(name, slug)
    `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    const products = !error && dbProducts ? dbProducts.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.product_categories?.name || 'Uncategorized',
        priceDisplay: p.price_display,
        unitPrice: Number(p.unit_price ?? p.price_value ?? 0),
        currency: p.currency ?? 'AED',
        description: p.description ?? '',
        rating: Number(p.rating),
        reviewCount: p.review_count ?? undefined,
        isFeatured: p.is_featured ?? false,
        inStock: p.is_active !== false,
        image: p.images?.[0] || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500&q=80',
        link: `/products/${p.slug}`,
    })) : [];

    // Unique categories in order of first appearance
    const categories = Array.from(new Set(products.map((p) => p.category)));

    return (
        <main className="min-h-screen bg-[#F9F5F0] pt-20">
            {/* Hero Section */}
            <section className="py-12 bg-[#F9F5F0]">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-4">
                            Shop Beauty
                        </h1>
                        <p className="text-stone-500 max-w-2xl mx-auto font-light text-lg">
                            Professional-grade skincare and beauty products curated by our experts.
                        </p>
                    </div>
                </div>
            </section>

            {/* Client shell: category tabs + grid */}
            <ProductsClientShell products={products} categories={categories} />

            {/* CTA */}
            <section className="w-full pb-12 pt-4">
                <div className="px-4 sm:px-8 lg:px-[55px]">
                    <div className="relative overflow-hidden rounded-2xl bg-[#6B4423] shadow-lg">
                        <div className="grid grid-cols-1 gap-6 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-2 md:items-center lg:px-16 lg:py-12">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                                    Expert Guidance
                                </p>
                                <h3 className="mb-3 text-2xl font-serif text-white sm:text-3xl">
                                    Need Help Choosing?
                                </h3>
                                <p className="text-sm leading-relaxed text-white/80 sm:text-base font-light">
                                    Our beauty experts are here to help you find the perfect products for your skin type.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-12 rounded-full bg-white px-7 text-sm font-semibold text-[#6B4423] shadow-md transition hover:bg-stone-50"
                                >
                                    <Link href="/consultation">Book Consultation</Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-12 rounded-full border border-white/40 bg-transparent px-7 text-sm font-medium text-white transition hover:border-white/70 hover:bg-white/10"
                                >
                                    <Link href="/contact">Contact Us</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
