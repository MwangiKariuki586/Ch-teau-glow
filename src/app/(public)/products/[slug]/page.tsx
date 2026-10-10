import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ProductDetailsPage } from '@/features/public/products/components/product-details-page';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: product } = await supabase
        .from('products')
        .select('name, description')
        .eq('slug', slug)
        .single();

    if (!product) {
        return {
            title: 'Product Not Found - Château Glow Dubai',
        };
    }

    return {
        title: `${product.name} | Château Glow Dubai`,
        description: product.description || `Buy ${product.name} at Château Glow Dubai.`,
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <ProductDetailsPage slug={slug} />;
}
