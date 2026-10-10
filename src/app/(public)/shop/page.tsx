import { Metadata } from 'next';
import { ShopPage } from '@/features/public/shop';

export const metadata: Metadata = {
    title: 'Shop | Château Glow Dubai',
    description: 'Discover our complete collection of premium signature products curated for your aesthetic needs, available directly in our shop.',
};

export default function Page() {
    return <ShopPage />;
}
