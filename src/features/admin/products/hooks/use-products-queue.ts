"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ProductWithRelations, CategoryOption, BranchOption } from "../types";

export type StatusFilter = "all" | "active" | "inactive";

function getCategoryName(p: ProductWithRelations): string {
  if (!p.product_categories) return "Uncategorized";
  if (Array.isArray(p.product_categories)) return p.product_categories[0]?.name ?? "Uncategorized";
  return p.product_categories.name;
}

function getBranchName(p: ProductWithRelations): string {
  if (!p.branches) return "Unassigned";
  if (Array.isArray(p.branches)) return p.branches[0]?.name ?? "Unassigned";
  return p.branches.name;
}

export { getCategoryName, getBranchName };

export function useProductsQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const hasLoadedRef = useRef(false);

  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Sync selectedProductId from URL
  useEffect(() => {
    const id = searchParams.get("productId");
    setSelectedProductId(id || null);
  }, [searchParams]);

  const setSelectedProductIdWithUrl = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (id) {
        next.set("productId", id);
      } else {
        next.delete("productId");
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setSelectedProductId(id);
    },
    [pathname, router, searchParams],
  );

  const loadProducts = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("products")
          .select("*, product_categories(name), branches(name)")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setProducts((data ?? []) as ProductWithRelations[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Load categories and branches once
  useEffect(() => {
    Promise.all([
      supabase.from("product_categories").select("id, name").eq("is_active", true).order("name"),
      supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
    ]).then(([catRes, branchRes]) => {
      setCategories((catRes.data ?? []) as CategoryOption[]);
      setBranches((branchRes.data ?? []) as BranchOption[]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mode = hasLoadedRef.current ? "refresh" : "initial";
    hasLoadedRef.current = true;
    void loadProducts(mode);
  }, [loadProducts]);

  const triggerReload = useCallback(() => {
    void loadProducts("refresh");
  }, [loadProducts]);

  const toggleStatus = useCallback(
    async (productId: string, currentStatus: boolean) => {
      const key = `${productId}:status`;
      setPendingAction(key);
      try {
        const { error: updateError } = await supabase
          .from("products")
          .update({ is_active: !currentStatus })
          .eq("id", productId);
        if (updateError) throw updateError;
        toast.success(`Product ${!currentStatus ? "activated" : "deactivated"}.`);
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_active: !currentStatus } : p)),
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status.");
      } finally {
        setPendingAction((c) => (c === key ? null : c));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const deleteProduct = useCallback(
    async (productId: string, productName: string) => {
      const key = `${productId}:delete`;
      setPendingAction(key);
      try {
        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .eq("id", productId);
        if (deleteError) throw deleteError;
        toast.success("Product deleted.");
        if (selectedProductId === productId) setSelectedProductIdWithUrl(null);
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete product.");
      } finally {
        setPendingAction((c) => (c === key ? null : c));
      }
    },
    [selectedProductId, setSelectedProductIdWithUrl, supabase],
  );

  // Client-side filtering
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      getCategoryName(p).toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.is_active) ||
      (statusFilter === "inactive" && !p.is_active);
    const matchCategory =
      categoryFilter === "all" || p.category_id === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  return {
    products: filteredProducts,
    allProducts: products,
    categories,
    branches,
    loading,
    refreshing,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    selectedProductId,
    setSelectedProductId: setSelectedProductIdWithUrl,
    editProductId,
    setEditProductId,
    pendingAction,
    triggerReload,
    toggleStatus,
    deleteProduct,
  };
}
