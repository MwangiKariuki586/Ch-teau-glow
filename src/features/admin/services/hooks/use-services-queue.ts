"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { ServiceStatus } from "@/lib/constants/service-status";

export type ServiceListItem = {
  id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
  is_featured: boolean;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
  duration_minutes: number;
  category: { id: string; name: string } | null;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type ServicesPagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE = 20;

export function useServicesQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<ServicesPagination>({
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);

  // Sync selectedServiceId from URL
  useEffect(() => {
    const id = searchParams.get("serviceId");
    setSelectedServiceId(id || null);
  }, [searchParams]);

  const setSelectedServiceIdWithUrl = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (id) {
        next.set("serviceId", id);
      } else {
        next.delete("serviceId");
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setSelectedServiceId(id);
    },
    [pathname, router, searchParams],
  );

  // Load categories once
  useEffect(() => {
    fetch("/api/admin/services/options", { cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        setCategories((result.data?.categories ?? []) as CategoryOption[]);
      })
      .catch(() => {});
  }, []);

  const loadServices = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (categoryFilter !== "all") params.set("category", categoryFilter);

        const res = await fetch(`/api/admin/services?${params.toString()}`, {
          cache: "no-store",
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Failed to load services.");

        setServices(result.data ?? []);
        setPagination(result.pagination ?? { total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load services.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, statusFilter, categoryFilter],
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    const mode = hasLoadedRef.current ? "refresh" : "initial";
    hasLoadedRef.current = true;
    void loadServices(mode);
  }, [loadServices]);

  const triggerReload = useCallback(() => {
    void loadServices("refresh");
  }, [loadServices]);

  const updateStatus = useCallback(
    async (serviceId: string, status: ServiceStatus) => {
      const key = `${serviceId}:status`;
      setPendingAction(key);
      try {
        const res = await fetch(`/api/admin/services/${serviceId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Failed to update status.");
        toast.success(`Service moved to ${status}.`);
        triggerReload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status.");
      } finally {
        setPendingAction((c) => (c === key ? null : c));
      }
    },
    [triggerReload],
  );

  const deleteService = useCallback(
    async (serviceId: string, serviceName: string) => {
      const key = `${serviceId}:delete`;
      setPendingAction(key);
      try {
        const res = await fetch(`/api/admin/services/${serviceId}`, { method: "DELETE" });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Failed to delete service.");
        toast.success("Service deleted.");
        if (selectedServiceId === serviceId) setSelectedServiceIdWithUrl(null);
        triggerReload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete service.");
      } finally {
        setPendingAction((c) => (c === key ? null : c));
      }
    },
    [selectedServiceId, setSelectedServiceIdWithUrl, triggerReload],
  );

  const filteredServices = search.trim()
    ? services.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.category?.name.toLowerCase().includes(search.toLowerCase()),
      )
    : services;

  const showingFrom = pagination.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(pagination.total, page * PAGE_SIZE);

  return {
    services: filteredServices,
    categories,
    loading,
    refreshing,
    error,
    pagination,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    page,
    setPage,
    selectedServiceId,
    setSelectedServiceId: setSelectedServiceIdWithUrl,
    pendingAction,
    triggerReload,
    updateStatus,
    deleteService,
    showingFrom,
    showingTo,
  };
}
