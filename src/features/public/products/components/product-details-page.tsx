import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Star, ArrowLeft, Check, ShieldCheck, Truck, ChevronRight } from 'lucide-react';
import { ProductImageGallery } from './product-image-gallery';
import { AddToCartControls } from './add-to-cart-controls';
import { ProductCard } from './product-card';

export async function ProductDetailsPage({ slug }: { slug: string }) {
    const supabase = await createClient();

    // Fetch product and its category
    const { data: product, error } = await supabase
        .from('products')
        .select(`
      *,
      category:product_categories(name, slug)
    `)
        .eq('slug', slug)
        .single();

    if (error || !product || !product.is_active) {
        notFound();
    }

    // Fetch related products from the same category
    const { data: relatedProducts } = await supabase
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
      product_categories!inner(name, slug)
    `)
        .eq('is_active', true)
        .eq('product_categories.slug', product.category?.slug || '')
        .neq('id', product.id)
        .limit(4);

    const formattedRelatedProducts = relatedProducts?.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.product_categories?.name || 'Uncategorized',
        priceDisplay: p.price_display,
        unitPrice: Number(p.unit_price ?? p.price_value ?? 0),
        currency: p.currency ?? 'AED',
        description: p.description ?? '',
        rating: Number(p.rating),
        image: p.images?.[0] || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500&q=80',
        link: `/products/${p.slug}`,
    })) || [];

    const productImages = product.images && product.images.length > 0
        ? product.images
        : ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80'];

    return (
        <main className="min-h-screen bg-[#F9F5F0] pt-20">
            {/* Product Details Section */}
            <section className="pt-4 pb-12">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    {/* Breadcrumb */}
                    <nav className="flex items-center text-xs text-stone-400 mb-16" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-stone-600 transition-colors">
                            Home
                        </Link>
                        <ChevronRight className="mx-1.5 h-3 w-3" />
                        <Link href="/products" className="hover:text-stone-600 transition-colors">
                            Products
                        </Link>
                        <ChevronRight className="mx-1.5 h-3 w-3" />
                        <span className="text-stone-600">{product.category?.name || 'Uncategorized'}</span>
                    </nav>

                    <div className="grid gap-12 lg:grid-cols-2">
                        {/* Product Images */}
                        <div>
                            <ProductImageGallery
                                images={productImages}
                                productName={product.name}
                                isFeatured={product.is_featured}
                            />
                        </div>

                        {/* Product Information */}
                        <div className="flex flex-col space-y-6">
                            {/* Category Badge */}
                            <Badge variant="secondary" className="w-fit bg-stone-100 text-stone-600 border-0 text-xs uppercase tracking-wider">
                                {product.category?.name || 'Uncategorized'}
                            </Badge>

                            {/* Product Name */}
                            <h1 className="text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
                                {product.name}
                            </h1>

                            {/* Rating */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 ${i < Math.floor(product.rating || 5)
                                                ? 'fill-[#C9A96E] text-[#C9A96E]'
                                                : 'fill-stone-200 text-stone-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm text-stone-500">
                                    {product.rating || '5.0'} (127 reviews)
                                </span>
                            </div>

                            {/* Price */}
                            <div className="py-4 border-y border-stone-200">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-bold text-stone-900">
                                        {product.price_display}
                                    </span>
                                    <span className="text-lg text-stone-400 line-through">
                                        AED {(parseFloat(product.price_display?.replace(/[^\d.]/g, '') || '0') * 1.2).toFixed(0)}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-stone-500">
                                    Tax included • Free shipping on orders over AED 200
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-lg font-serif text-stone-900 mb-3">About This Product</h3>
                                <p className="text-stone-600 leading-relaxed font-light">
                                    {product.description || 'This premium product is carefully selected by our beauty experts to ensure the highest quality results. Formulated with advanced ingredients and designed for optimal efficacy.'}
                                </p>
                            </div>

                            {/* Add to Cart */}
                            <div className="pt-4">
                                <AddToCartControls
                                    product={{
                                        productId: product.id,
                                        name: product.name,
                                        slug: product.slug,
                                        image: productImages[0],
                                        unitPrice: Number(product.unit_price ?? product.price_value ?? 0),
                                        priceDisplay: product.price_display,
                                        currency: product.currency ?? 'AED',
                                    }}
                                />
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-stone-50">
                                    <ShieldCheck className="h-5 w-5 text-[#6B4423]" />
                                    <div>
                                        <p className="text-sm font-medium text-stone-900">Authentic</p>
                                        <p className="text-xs text-stone-500">100% genuine</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-stone-50">
                                    <Truck className="h-5 w-5 text-[#6B4423]" />
                                    <div>
                                        <p className="text-sm font-medium text-stone-900">Fast Delivery</p>
                                        <p className="text-xs text-stone-500">Next day in UAE</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Status */}
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                                <Check className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="text-sm font-medium text-green-800">In Stock & Ready to Ship</p>
                                    <p className="text-xs text-green-700">Order within 2 hours for same-day dispatch</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Related Products Section */}
            {formattedRelatedProducts.length > 0 && (
                <section className="py-12 bg-[#F9F5F0]">
                    <div className="max-w-7xl mx-auto px-6 md:px-12">
                        <div className="mb-8">
                            <h2 className="text-2xl font-serif text-stone-900 mb-2">You Might Also Like</h2>
                            <p className="text-stone-600 font-light">
                                More from {product.category?.name || 'this category'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {formattedRelatedProducts.map((relatedProduct) => (
                                <ProductCard key={relatedProduct.id} product={relatedProduct} />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}
