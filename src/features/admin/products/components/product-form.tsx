"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  category_id: z.string().min(1, "Please select a valid category"),
  branch_id: z.string().uuid("Please select a branch"),
  price_display: z.string().min(1, "Price display is required (e.g. AED 4500 per syringe)"),
  price_value: z.coerce.number().optional(),
  currency: z.string().default("AED"),
  rating: z.coerce.number().min(0).max(5).default(5),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: any;
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  onSuccess?: () => void;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Separator className="mt-2" />
      </div>
      {children}
    </div>
  );
}

export function ProductForm({ initialData, categories, branches, onSuccess }: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const [imageFiles, setImageFiles] = useState<{ file: File; preview: string }[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(
    initialData?.images || (initialData?.image_url ? [initialData.image_url] : []),
  );
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const generateSlug = (name: string): string =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema as any),
    defaultValues: initialData
      ? {
          ...initialData,
          branch_id: initialData.branch_id ?? "",
          images: initialData.images || (initialData.image_url ? [initialData.image_url] : []),
        }
      : {
          name: "",
          slug: "",
          category_id: "",
          branch_id: "",
          price_display: "",
          price_value: 0,
          currency: "AED",
          rating: 4.8,
          description: "",
          images: [],
          is_active: true,
          is_featured: false,
        },
  });

  const watchedName = form.watch("name");

  useEffect(() => {
    if (!slugManuallyEdited && watchedName && !initialData) {
      form.setValue("slug", generateSlug(watchedName));
    }
  }, [watchedName, slugManuallyEdited, form, initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles((prev) => [
        ...prev,
        ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
      ]);
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      const uploadedUrls: string[] = [];
      const pathId = initialData?.id || data.slug;

      for (const img of imageFiles) {
        const { uploadProductImage } = await import("@/lib/supabase/storage");
        const url = await uploadProductImage(pathId, img.file);
        uploadedUrls.push(url);
      }

      const finalImages = [...existingImages, ...uploadedUrls];
      const submitData = { ...data, unit_price: data.price_value ?? null, images: finalImages };
      delete (submitData as any).image_url;

      if (initialData?.id) {
        const { error } = await supabase.from("products").update(submitData).eq("id", initialData.id);
        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        const { error } = await supabase.from("products").insert(submitData);
        if (error) throw error;
        toast.success("Product created successfully");
      }

      imageFiles.forEach((img) => URL.revokeObjectURL(img.preview));

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/products");
        router.refresh();
      }
    } catch (error: any) {
      toast.error("Failed to save product", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Identity ── */}
        <FormSection title="Identity">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Steroid Injection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. steroid-injection"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (e.target.value !== generateSlug(watchedName)) {
                          setSlugManuallyEdited(true);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>Auto-generated from name.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Branch <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Stock deducted from this branch on orders.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* ── Pricing ── */}
        <FormSection title="Pricing">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="price_display"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Display <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AED 4500 per syringe" {...field} />
                  </FormControl>
                  <FormDescription>Shown to customers.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numeric Value</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 4500" {...field} />
                  </FormControl>
                  <FormDescription>For sorting and filtering.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating (0–5)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" max="5" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* ── Description ── */}
        <FormSection title="Description">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell customers about this product…"
                    className="min-h-24 resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* ── Images ── */}
        <FormSection title="Images">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {existingImages.map((url, index) => (
              <div
                key={`existing-${index}`}
                className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200"
              >
                <img src={url} alt={`Product ${index}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {imageFiles.map((img, index) => (
              <div
                key={`new-${index}`}
                className="group relative aspect-square overflow-hidden rounded-xl border-2 border-[#C9A96E]"
              >
                <img src={img.preview} alt={`Upload ${index}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-[#3E2723]/80 py-0.5 text-center text-[10px] text-white">
                  Pending
                </div>
              </div>
            ))}

            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 transition-colors hover:border-[#C9A96E] hover:bg-[#FFF8F0]">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="mt-1.5 text-xs text-muted-foreground">Add</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            First image is the main display image. Max 10 images.
          </p>
        </FormSection>

        {/* ── Visibility ── */}
        <FormSection title="Visibility">
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active</p>
                    <p className="text-xs text-muted-foreground">Visible on the public site.</p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Toggle active"
                  />
                </div>
              )}
            />
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Featured</p>
                    <p className="text-xs text-muted-foreground">Shown prominently on the home page.</p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Toggle featured"
                  />
                </div>
              )}
            />
          </div>
        </FormSection>

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#3E2723] text-white hover:bg-[#52342d]"
          >
            {isLoading ? "Saving…" : initialData ? "Update Product" : "Create Product"}
          </Button>
          {onSuccess && (
            <Button type="button" variant="outline" onClick={onSuccess} disabled={isLoading}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
