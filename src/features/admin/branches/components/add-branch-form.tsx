'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, MapPin, Building2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function AddBranchForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    country: initialData?.country || '',
    postal_code: initialData?.postal_code || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    description: initialData?.description || '',
    is_active: initialData?.is_active ?? true,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.city || !formData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from('branches')
          .update({
            name: formData.name,
            description: formData.description || null,
            address: formData.address,
            city: formData.city,
            state: formData.state || null,
            country: formData.country,
            postal_code: formData.postal_code || null,
            phone: formData.phone || null,
            email: formData.email || null,
            ...(imagePreview ? { image_url: imagePreview } : {}),
            is_active: formData.is_active,
          })
          .eq('id', initialData.id);

        if (error) throw error;
        toast.success('Branch updated successfully');
      } else {
        const { error } = await supabase
          .from('branches')
          .insert([{
            name: formData.name,
            description: formData.description || null,
            address: formData.address,
            city: formData.city,
            state: formData.state || null,
            country: formData.country,
            postal_code: formData.postal_code || null,
            phone: formData.phone || null,
            email: formData.email || null,
            image_url: imagePreview,
            is_active: formData.is_active,
          }]);

        if (error) throw error;
        toast.success('Branch created successfully');
      }

      router.push('/admin/branches');
      router.refresh();

    } catch (error: any) {
      console.error('Error creating branch:', error);
      toast.error('Failed to create branch', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/branches">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {initialData ? 'Edit Branch' : 'Add New Branch'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {initialData ? 'Update branch location details' : 'Create a new branch location'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full max-w-2xl">
                {imagePreview || initialData?.image_url ? (
                  <div className="relative aspect-video overflow-hidden rounded-2xl border-4 border-white shadow-xl">
                    <img
                      src={imagePreview || initialData?.image_url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-2xl border-4 border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                    <Building2 className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <Label
                  htmlFor="image"
                  className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300"
                >
                  <Upload className="h-4 w-4" />
                  Upload Branch Photo
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <p className="mt-2 text-xs text-gray-500">
                  PNG, JPG up to 10MB (Recommended: 1920x1080)
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
            <Building2 className="h-5 w-5 text-primary" />
            Branch Details
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Branch Name *</Label>
              <Input
                id="name"
                placeholder="Château Glow Dubai Mall"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this branch location..."
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
        </Card>

        {/* Location Information */}
        <Card className="p-6">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
            <MapPin className="h-5 w-5 text-primary" />
            Location
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                placeholder="123 Sheikh Zayed Road"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Dubai"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Emirate</Label>
              <Input
                id="state"
                placeholder="Dubai"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                placeholder="United Arab Emirates"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                placeholder="00000"
                value={formData.postal_code}
                onChange={(e) =>
                  setFormData({ ...formData, postal_code: e.target.value })
                }
              />
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6">
          <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
            Contact Information
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+971 4 123 4567"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="dubai@browz.ae"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>
        </Card>

        {/* Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_active" className="text-base font-semibold">
                Active Status
              </Label>
              <p className="text-sm text-gray-500">
                Make this branch visible on the website
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Branch' : 'Create Branch')}
          </Button>
        </div>
      </form>
    </div>
  );
}
