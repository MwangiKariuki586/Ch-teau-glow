'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AdminFormShell } from './admin-form-shell';
import { useAdminSupabase } from './use-admin-supabase';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getCategoryCreateErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string; details?: string };
    if (err.code === '23505') {
      if (err.message?.includes('service_categories_slug_unique')) {
        return 'This slug already exists. Use a different slug value.';
      }
      if (err.message?.includes('service_categories_name_unique')) {
        return 'This category name already exists.';
      }
      return 'Category already exists with the same unique value.';
    }
    if (err.message) return err.message;
  }

  return 'Unable to create category right now.';
}

export function CreateCategoryPage() {
  const { supabase, loadingAccess, isAdmin, accessError } = useAdminSupabase();
  const [categoryName, setCategoryName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (slugManuallyEdited) return;
    setSlug(slugify(categoryName));
  }, [categoryName, slugManuallyEdited]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!isAdmin) {
      toast.error('Admin access is required to create categories.');
      return;
    }

    const formData = new FormData(form);
    const categoryName = String(formData.get('name') ?? '').trim();
    const slug = String(formData.get('slug') ?? '').trim();
    const sortOrder = Number(formData.get('sort_order') ?? 0);

    setIsSubmitting(true);

    try {
      const [existingByNameResult, existingBySlugResult] = await Promise.all([
        supabase.from('service_categories').select('id').eq('name', categoryName).maybeSingle(),
        supabase.from('service_categories').select('id').eq('slug', slug).maybeSingle(),
      ]);

      if (existingByNameResult.error) throw existingByNameResult.error;
      if (existingBySlugResult.error) throw existingBySlugResult.error;

      if (existingByNameResult.data) {
        toast.error('This category name already exists.');
        return;
      }

      if (existingBySlugResult.data) {
        toast.error('This slug already exists. Use a different slug value.');
        return;
      }

      const { error } = await supabase.from('service_categories').insert({
        name: categoryName,
        slug,
        sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
        is_active: isActive,
      });

      if (error) throw error;

      toast.success(`Category "${categoryName}" created successfully.`);
      form.reset();
      setCategoryName('');
      setSlug('');
      setSlugManuallyEdited(false);
      setIsActive(true);
    } catch (error: unknown) {
      toast.error(getCategoryCreateErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const disableForm = loadingAccess || !isAdmin || isSubmitting;
  const handleReset = () => {
    setCategoryName('');
    setSlug('');
    setSlugManuallyEdited(false);
    setIsActive(true);
  };

  return (
    <AdminFormShell
      title="Create Category"
      description="Define a top-level category that services are linked to directly."
    >
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
          <CardDescription>These values are saved to `service_categories` in Supabase.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAccess && (
            <Alert className="mb-6">
              <AlertDescription>Checking admin access...</AlertDescription>
            </Alert>
          )}

          {!loadingAccess && accessError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{accessError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} onReset={handleReset} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Facial Aesthetics"
                  required
                  disabled={disableForm}
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="facial-aesthetics"
                  required
                  disabled={disableForm}
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                    setSlugManuallyEdited(true);
                  }}
                  onBlur={() => {
                    if (!slug.trim()) {
                      setSlug(slugify(categoryName));
                      setSlugManuallyEdited(false);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from category name. You can edit it manually.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Display Order</Label>
                <Input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  min={0}
                  defaultValue={0}
                  disabled={disableForm}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-foreground">Active Category</p>
                <p className="text-sm text-muted-foreground">Inactive categories are hidden from public pages.</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                aria-label="Toggle category active state"
                disabled={disableForm}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={disableForm} className="rounded-full bg-[#6B4423] hover:bg-[#4A2C1A]">
                {isSubmitting ? 'Saving...' : 'Create Category'}
              </Button>
              <Button type="reset" variant="outline" className="rounded-full" disabled={disableForm}>
                Clear Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminFormShell>
  );
}
