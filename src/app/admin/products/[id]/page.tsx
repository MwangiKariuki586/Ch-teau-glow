import { ProductForm } from '@/features/admin/products/components/product-form';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const resolvedParams = await params;

    const [productData, categoriesData, branchesData] = await Promise.all([
        supabase
            .from('products')
            .select('*')
            .eq('id', resolvedParams.id)
            .single(),
        supabase
            .from('product_categories')
            .select('id, name')
            .eq('is_active', true)
            .order('name'),
        supabase
            .from('branches')
            .select('id, name')
            .eq('is_active', true)
            .order('name'),
    ]);

    if (productData.error || !productData.data) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-2">
                <Link
                    href="/admin/products"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 w-9"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">Edit Product: {productData.data.name}</h2>
            </div>

            <div className="bg-card rounded-lg border p-6 mt-4">
                <ProductForm
                    initialData={productData.data}
                    categories={categoriesData.data || []}
                    branches={branchesData.data || []}
                />
            </div>
        </div>
    );
}
