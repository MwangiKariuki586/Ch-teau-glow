import { ProductsIndexPage } from '@/features/public/products/components/products-index-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Products | Château Glow Dubai',
    description: 'Discover our complete collection of premium signature products curated for your aesthetic needs.',
};

export default function Page() {
    return <ProductsIndexPage />;
}
