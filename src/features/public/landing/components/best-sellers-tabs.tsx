'use client';

import { Star, Heart, Eye, ShoppingCart, Award } from 'lucide-react';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Product = {
    id: string;
    name: string;
    category: string;
    price: string;
    rating: number;
    image: string;
    link: string;
    is_featured: boolean;
};

export function BestSellersTabs({ products }: { products: Product[] }) {
    const [activeTab, setActiveTab] = useState('All');

    // Extract unique categories dynamically based on products, plus 'All'
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return ['All', ...Array.from(cats)];
    }, [products]);

    // Filter and limit products to 4, prioritizing featured products
    const filteredProducts = useMemo(() => {
        let filtered = activeTab === 'All'
            ? products
            : products.filter(product => product.category === activeTab);
        
        // Sort by featured status first, then by other criteria
        filtered = filtered.sort((a, b) => {
            // Featured products first
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            // Then by rating
            return b.rating - a.rating;
        });

        // Limit to 4 products
        return filtered.slice(0, 4);
    }, [products, activeTab]);

    if (!products.length) {
        return <div className="py-12 text-center text-gray-500">No products found.</div>;
    }

    return (
        <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                <TabsList className="h-auto flex-wrap gap-3 bg-transparent">
                    {categories.map((tab) => (
                        <TabsTrigger
                            key={tab}
                            value={tab}
                            className="rounded-full px-5 py-2 data-[state=active]:bg-[#6B4423] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700"
                        >
                            {tab}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                    <Card key={product.id} className="group relative overflow-hidden rounded-2xl shadow-sm transition hover:shadow-lg p-0">
                        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 opacity-0 transition group-hover:opacity-100">
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-md">
                                <Heart className="h-[18px] w-[18px]" />
                            </Button>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-md">
                                <Eye className="h-[18px] w-[18px]" />
                            </Button>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-md">
                                <ShoppingCart className="h-[18px] w-[18px]" />
                            </Button>
                        </div>

                        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                            <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                            />
                            {product.is_featured && (
                                <div className="absolute left-3 top-3 z-10">
                                    <Badge className="bg-gradient-to-r from-[#6B4423] to-[#8B5A2B] text-white shadow-lg">
                                        <Award className="h-3 w-3 mr-1" />
                                        Featured
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <CardContent className="p-4">
                            <p className="mb-1 text-sm font-medium text-gray-900">{product.category}</p>
                            <h3 className="mb-2 text-lg font-semibold text-gray-900">{product.name}</h3>

                            <div className="mb-3 flex items-center gap-1">
                                <Star className="h-4 w-4 fill-[#c9a961] text-[#c9a961]" />
                                <span className="text-sm font-semibold text-gray-900">{product.rating}</span>
                            </div>

                            <div className="mb-3">
                                <span className="text-lg font-bold text-[#c9a961]">{product.price}</span>
                            </div>

                            <Button asChild className="w-full rounded-full bg-[#6B4423] text-sm hover:bg-[#4A2C1A]">
                                <Link href={product.link}>View Details</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </>
    );
}
