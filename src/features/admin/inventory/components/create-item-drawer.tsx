"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { uploadProductImage } from "@/lib/supabase/storage";
import { slugify } from "@/lib/slugify";
import type { Branch, CreateAssetType, ProductCategoryOption } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialItemType?: CreateAssetType;
}

export function CreateItemDrawer({
  open,
  onOpenChange,
  onCreated,
  initialItemType = "consumable",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    item_type: initialItemType,
    unit: "unit",
    is_active: true,
    branch_id: "",
    category_id: "",
    price_display: "",
    price_value: "",
    description: "",
    slug: "",
  });

  useEffect(() => {
    if (!open) return;

    void fetch("/api/admin/branches")
      .then((r) => r.json())
      .then((json) => setBranches(json.data ?? []))
      .catch(() => setBranches([]));

    void fetch("/api/admin/product-categories")
      .then((r) => r.json())
      .then((json) => setCategories(json.data ?? []))
      .catch(() => setCategories([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({
      ...current,
      item_type: initialItemType,
    }));
  }, [initialItemType, open]);

  const derivedSlug = useMemo(
    () => (form.slug.trim() ? slugify(form.slug) : slugify(form.name)),
    [form.name, form.slug],
  );

  const resetForm = () => {
    setForm({
      name: "",
      sku: "",
      item_type: initialItemType,
      unit: "unit",
      is_active: true,
      branch_id: "",
      category_id: "",
      price_display: "",
      price_value: "",
      description: "",
      slug: "",
    });
    setImageFiles([]);
  };

  const uploadImages = async () => {
    if (form.item_type !== "retail_product" || imageFiles.length === 0) {
      return [];
    }

    const assetFolder = derivedSlug;
    const urls: string[] = [];
    for (const file of imageFiles) {
      urls.push(await uploadProductImage(assetFolder, file));
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Asset name is required.");
      return;
    }
    if (!form.branch_id) {
      toast.error("Select a branch.");
      return;
    }
    if (form.item_type === "retail_product" && !form.category_id) {
      toast.error("Retail products need a category.");
      return;
    }
    if (form.item_type === "retail_product" && !form.price_display.trim()) {
      toast.error("Retail products need a display price.");
      return;
    }
    setLoading(true);
    try {
      const images = await uploadImages();
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        item_type: form.item_type,
        unit: form.unit.trim() || "unit",
        is_active: form.is_active,
        branch_id: form.branch_id,
        ...(form.item_type === "retail_product"
          ? {
              category_id: form.category_id,
              price_display: form.price_display.trim(),
              price_value: form.price_value.trim()
                ? Number(form.price_value)
                : null,
              description: form.description.trim() || null,
              slug: derivedSlug,
              images,
            }
          : {}),
      };
      const res = await fetch("/api/admin/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create asset.");
      toast.success(
        form.item_type === "retail_product"
          ? "Retail asset created."
          : "Consumable created.",
      );
      resetForm();
      onCreated();
    } catch (err: unknown) {
      toast.error("Failed to create asset.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Inventory Asset</SheetTitle>
          <SheetDescription>
            Create retail products or consumables from one inventory entrypoint.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-1 py-6">
          <div className="space-y-2">
            <Label htmlFor="name">
              Asset Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Hyaluronic Acid Serum"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU (optional)</Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              placeholder="e.g. SKU-001"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Asset Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.item_type}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  item_type: v as CreateAssetType,
                }))
              }
            >
              <SelectTrigger className="border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumable">Consumable</SelectItem>
                <SelectItem value="retail_product">Retail Product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Branch <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.branch_id}
              onValueChange={(branch_id) =>
                setForm((f) => ({ ...f, branch_id }))
              }
            >
              <SelectTrigger className="border-gray-200">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit of Measure</Label>
            <Input
              id="unit"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="e.g. unit, ml, kg, bottle"
              className="border-gray-200"
            />
          </div>

          {form.item_type === "retail_product" && (
            <>
              <div className="space-y-2">
                <Label>
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.category_id}
                  onValueChange={(category_id) =>
                    setForm((f) => ({ ...f, category_id }))
                  }
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="auto-generated if left blank"
                  className="border-gray-200"
                />
                <p className="text-xs text-gray-500">
                  Final slug: <span className="font-medium">{derivedSlug}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price_display">
                    Display Price <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price_display"
                    value={form.price_display}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        price_display: e.target.value,
                      }))
                    }
                    placeholder="e.g. AED 450"
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_value">Numeric Price</Label>
                  <Input
                    id="price_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price_value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        price_value: e.target.value,
                      }))
                    }
                    placeholder="e.g. 450"
                    className="border-gray-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional catalogue description"
                  className="border-gray-200 resize-none"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">Images</Label>
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    setImageFiles(Array.from(e.target.files ?? []))
                  }
                  className="border-gray-200"
                />
                {imageFiles.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {imageFiles.length} image
                    {imageFiles.length === 1 ? "" : "s"} selected
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-gray-500">
                Inactive assets are hidden from stock and product views.
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          </div>

          <SheetFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Asset
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
