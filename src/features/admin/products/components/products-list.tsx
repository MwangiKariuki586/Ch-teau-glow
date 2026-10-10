'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Edit, Trash2, Search, Filter, Plus, Package, Star } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Product {
  branches: { name: string }[];
  id: string;
  name: string;
  category_id: string;
  price_display: string;
  rating: number;
  images: string[];
  is_active: boolean;
  product_categories: { name: string }[];
}

export function ProductsList({ initialData }: { initialData: any[] }) {
  const [products, setProducts] = useState<Product[]>(
    initialData.map(p => ({
      ...p,
      branches: Array.isArray(p.branches) ? p.branches : p.branches ? [p.branches] : [],
      product_categories: Array.isArray(p.product_categories)
        ? p.product_categories
        : [p.product_categories],
    }))
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const categories = Array.from(
    new Set(products.map(p => p.product_categories[0]?.name).filter(Boolean))
  );

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      p.product_categories[0]?.name.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active);
    return matchSearch && matchStatus;
  });

  const total = products.length;
  const active = products.filter(p => p.is_active).length;
  const inactive = products.filter(p => !p.is_active).length;

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted');
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to delete product', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      if (error) throw error;
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p)
      );
      toast.success(`Product ${!product.is_active ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      toast.error('Failed to update status', { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Products', value: total, color: 'text-gray-900' },
          { label: 'Active', value: active, color: 'text-emerald-600' },
          { label: 'Inactive', value: inactive, color: 'text-rose-500' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={cn('text-3xl font-bold mt-1', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 border-gray-200"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] border-gray-200">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button asChild className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white shrink-0">
            <Link href="/admin/inventory?create=retail">
              <Plus className="h-4 w-4 mr-2" />
              Add Product in Inventory
            </Link>
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-12 w-12 text-gray-300" />
                      <p className="text-base font-medium text-gray-700">No products found</p>
                      <p className="text-sm text-gray-400">Add your first product to get started.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(product => (
                  <TableRow key={product.id} className="hover:bg-[#FFF8F0]/40 transition-colors">
                    <TableCell>
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {product.product_categories[0]?.name || 'Uncategorized'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {product.branches[0]?.name || 'Unassigned'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-700">
                      {product.price_display}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-[#C9A96E] text-[#C9A96E]" />
                        <span className="text-sm text-gray-700">{product.rating ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'text-xs font-medium cursor-pointer select-none',
                          product.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                        )}
                        onClick={() => toggleStatus(product)}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs text-[#6B4423] hover:bg-[#6B4423]/10"
                          onClick={() => router.push(`/admin/products/${product.id}`)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs text-rose-500 hover:bg-rose-50"
                          onClick={() => handleDelete(product.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Showing {filtered.length} of {total} products
          </div>
        )}
      </div>
    </div>
  );
}
