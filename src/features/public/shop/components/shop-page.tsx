import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Heart, Share2, ShieldCheck, Truck, Check } from 'lucide-react';
import { ShopAddToCartButton } from './shop-add-to-cart-button';

export async function ShopPage() {
    const supabase = await createClient();

    // Fetch all active products
    const { data: dbProducts, error } = await supabase
        .from('products')
        .select(`
            *,
            category:product_categories(name, slug)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    const products = !error && dbProducts ? dbProducts : [];

    return (
        <main className="min-h-screen bg-gray-50 pb-20 pt-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 sm:mb-12 text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">The Shop</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
                        Discover our complete collection of premium signature products curated for your aesthetic needs.
                        Select and add products directly to your cart.
                    </p>
                    <div className="mt-5 sm:mt-6">
                        <Button asChild variant="outline" className="rounded-full">
                            <Link href="/cart">View Cart</Link>
                        </Button>
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        No products available at the moment.
                    </div>
                ) : (
                    <div className="flex flex-col gap-8 sm:gap-12">
                        {products.map((product: any) => (
                            <Card key={product.id} id={product.slug} className="overflow-hidden rounded-2xl sm:rounded-3xl border-0 shadow-sm transition hover:shadow-md bg-white">
                                <div className="grid gap-0 lg:grid-cols-2">
                                    {/* Product Image */}
                                    <div className="relative aspect-[4/3] sm:aspect-square w-full lg:aspect-auto lg:min-h-[420px] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                        <Image
                                            src={(product.images && product.images[0]) || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80'}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 1024px) 100vw, 50vw"
                                        />
                                        {product.is_featured && (
                                            <div className="absolute left-4 top-4 sm:left-6 sm:top-6 rounded-full bg-[#c9a961] px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-semibold text-white uppercase tracking-wider shadow-sm">
                                                Featured
                                            </div>
                                        )}
                                        <div className="absolute right-4 top-4 sm:right-6 sm:top-6 flex flex-col gap-2 sm:gap-3">
                                            <Button size="icon" variant="secondary" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-md hover:bg-white hover:text-[#c9a961] transition">
                                                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-md hover:bg-white hover:text-[#c9a961] transition">
                                                <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <CardContent className="flex flex-col p-6 sm:p-8 lg:p-12">
                                        <span className="mb-2 text-xs sm:text-sm font-bold uppercase tracking-widest text-[#c9a961]">
                                            {product.category?.name || 'Uncategorized'}
                                        </span>

                                        <h2 className="mb-3 sm:mb-4 text-xl sm:text-3xl font-bold text-gray-900 md:text-4xl">{product.name}</h2>

                                        <div className="mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
                                            <div className="flex items-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${i < Math.floor(product.rating || 5)
                                                            ? 'fill-[#c9a961] text-[#c9a961]'
                                                            : 'fill-gray-200 text-gray-200'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-600 whitespace-nowrap">
                                                {product.rating || '5.0'} / 5.0 Rating
                                            </span>
                                        </div>

                                        <div className="mb-4 sm:mb-6 flex items-baseline gap-2">
                                            <span className="text-2xl sm:text-3xl font-extrabold text-[#c9a961]">{product.price_display}</span>
                                            <span className="text-xs sm:text-sm text-gray-500 font-medium">Tax included</span>
                                        </div>

                                        <p className="mb-6 sm:mb-8 text-sm sm:text-base text-gray-600 leading-relaxed">
                                            {product.description || 'This premium product is carefully selected by our experts to ensure the highest quality results. Designed for optimal efficacy, it is the perfect complement to your daily routine.'}
                                        </p>

                                        <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4">
                                            <div className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-gray-50 p-3 sm:p-4 border border-gray-100">
                                                <div className="bg-white p-1.5 sm:p-2 rounded-full shadow-sm text-[#c9a961] shrink-0">
                                                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                                                </div>
                                                <h4 className="text-xs sm:text-sm font-bold text-gray-900">Quality Assured</h4>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-gray-50 p-3 sm:p-4 border border-gray-100">
                                                <div className="bg-white p-1.5 sm:p-2 rounded-full shadow-sm text-[#c9a961] shrink-0">
                                                    <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                                                </div>
                                                <h4 className="text-xs sm:text-sm font-bold text-gray-900">Fast Shipping</h4>
                                            </div>
                                        </div>

                                        <div className="mt-auto w-full">
                                            <ShopAddToCartButton
                                                product={{
                                                    productId: product.id,
                                                    name: product.name,
                                                    slug: product.slug,
                                                    image: (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
                                                    unitPrice: Number(product.unit_price ?? product.price_value ?? 0),
                                                    priceDisplay: product.price_display,
                                                    currency: product.currency ?? 'AED',
                                                }}
                                            />
                                        </div>

                                        <div className="mt-4 sm:mt-6 flex flex-col gap-1.5 border border-green-100 bg-green-50/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                                            <div className="flex items-center gap-2 text-green-700">
                                                <Check className="h-4 w-4 stroke-[3px]" />
                                                <span className="font-bold text-xs sm:text-sm">In Stock & Ready</span>
                                            </div>
                                            <p className="text-xs font-medium text-green-700/80 ml-6">Available to ship or collect in store today.</p>
                                        </div>
                                    </CardContent>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
