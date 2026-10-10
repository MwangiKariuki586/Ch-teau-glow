"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, WandSparkles, Archive, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SERVICE_STATUSES, type ServiceStatus } from "@/lib/constants/service-status";
import { cn } from "@/lib/utils";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type ServiceListItem = {
  id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
  is_featured: boolean;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
  duration_minutes: number;
  description?: string | null;
  category: { id: string; name: string } | null;
};

function formatPrice(minCents: number, maxCents: number, currency: string) {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (minCents === maxCents) return fmt.format(minCents / 100);
  return `${fmt.format(minCents / 100)} – ${fmt.format(maxCents / 100)}`;
}

const STATUS_PILL: Record<ServiceStatus, string> = {
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  draft:     "bg-gray-100 text-gray-600 border border-gray-200",
  archived:  "bg-rose-50 text-rose-600 border border-rose-200",
};

export function ServicesModulePage() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const [optionsRes, servicesRes] = await Promise.all([
          fetch("/api/admin/services/options", { signal: controller.signal, cache: "no-store" }),
          fetch(`/api/admin/services?status=${statusFilter}&category=${categoryFilter}&page=1&pageSize=100`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);
        const [optionsResult, servicesResult] = await Promise.all([
          optionsRes.json(),
          servicesRes.json(),
        ]);
        if (!optionsRes.ok) throw new Error(optionsResult.error ?? "Failed to load options.");
        if (!servicesRes.ok) throw new Error(servicesResult.error ?? "Failed to load services.");
        if (!isMounted) return;
        setCategories((optionsResult.data?.categories ?? []) as CategoryOption[]);
        setServices((servicesResult.data ?? []) as ServiceListItem[]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "Failed to load services.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchData();
    return () => { isMounted = false; controller.abort(); };
  }, [categoryFilter, refreshKey, statusFilter]);

  const updateStatus = async (serviceId: string, status: ServiceStatus) => {
    const actionKey = `${serviceId}:status`;
    setPendingAction(actionKey);

    try {
      const res = await fetch(`/api/admin/services/${serviceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to update status.");
      toast.success(`Service moved to ${status}.`);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status.");
    } finally {
      setPendingAction((current) => (current === actionKey ? null : current));
    }
  };

  const deleteService = async (service: Pick<ServiceListItem, "id" | "name">) => {
    if (!window.confirm(`Delete "${service.name}"? This cannot be undone.`)) {
      return;
    }

    const actionKey = `${service.id}:delete`;
    setPendingAction(actionKey);

    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to delete service.");
      toast.success("Service deleted.");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service.");
    } finally {
      setPendingAction((current) => (current === actionKey ? null : current));
    }
  };

  // Stats
  const totalPublished = services.filter(s => s.status === "published").length;
  const totalFeatured  = services.filter(s => s.is_featured).length;

  const categoryOptions = useMemo(() => [
    { id: "all", name: "All categories" },
    ...categories.map(c => ({ id: c.id, name: c.name })),
  ], [categories]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Module</h1>
          <p className="text-sm text-gray-500 mt-1">Manage categories, services, publish states, and booking mappings.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/categories/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#6B4423] hover:bg-[#4A2C1A] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Category
          </Link>
          <Link
            href="/admin/services/new"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Service
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Categories",               value: categories.length, sub: "Active and inactive service groups" },
          { label: "Services (Current Filter)", value: services.length,  sub: "Total rows in the current view" },
          { label: "Published",                 value: totalPublished,   sub: "Publicly visible services" },
          { label: "Featured",                  value: totalFeatured,    sub: "Promoted across landing sections" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Catalog section */}
      <div className="bg-white rounded-xl border border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {/* Catalog header + filters */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Catalog</h2>
            <p className="text-xs text-gray-400 mt-0.5">Filter services, open edit pages, and quickly publish, archive, or delete.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as "all" | ServiceStatus)}
              className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none"
            >
              <option value="all">All statuses</option>
              {SERVICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none"
            >
              {categoryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        {loading && (
          <p className="text-sm text-gray-400 py-10 text-center">Loading services...</p>
        )}

        {!loading && services.length === 0 && (
          <p className="text-sm text-gray-400 py-10 text-center">
            No services match the current filters.{" "}
            <Link href="/admin/services/new" className="text-[#6B4423] hover:underline">Add one</Link>.
          </p>
        )}

        {!loading && services.map((service, idx) => {
          const statusAction =
            service.status === "published"
              ? {
                  label: "Archive",
                  nextStatus: "archived" as ServiceStatus,
                  Icon: Archive,
                  className: "text-amber-600 hover:text-amber-800 hover:bg-amber-50",
                }
              : {
                  label: "Publish",
                  nextStatus: "published" as ServiceStatus,
                  Icon: WandSparkles,
                  className: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                };
          const statusActionKey = `${service.id}:status`;
          const deleteActionKey = `${service.id}:delete`;
          const isStatusPending = pendingAction === statusActionKey;
          const isDeletePending = pendingAction === deleteActionKey;
          const isBusy = pendingAction?.startsWith(`${service.id}:`) ?? false;

          return <div
            key={service.id}
            className={cn(
              "flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors",
              idx !== services.length - 1 && "border-b border-gray-100"
            )}
          >
            {/* Left: name + meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{service.name}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_PILL[service.status])}>
                  {service.status}
                </span>
                {service.is_featured && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#C9A96E]/15 text-[#6B4423] border border-[#C9A96E]/30">
                    featured
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {service.category?.name ?? "Uncategorized"} • {formatPrice(service.min_price_cents, service.max_price_cents, service.currency)} • {service.duration_minutes} min
              </p>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={`/services/${service.slug}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </Link>
              <Link
                href={`/admin/services/${service.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
              <button
                onClick={() => updateStatus(service.id, statusAction.nextStatus)}
                disabled={isBusy}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  statusAction.className
                )}
              >
                {isStatusPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <statusAction.Icon className="w-3.5 h-3.5" />
                )}{" "}
                {statusAction.label}
              </button>
              <button
                onClick={() => deleteService(service)}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletePending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}{" "}
                Delete
              </button>
            </div>
          </div>
        })}
      </div>
    </div>
  );
}
