"use client";

import { useEffect, useState } from "react";
import {
  Pencil,
  Power,
  PowerOff,
  Plus,
  Trash2,
  Loader2,
  Package as PackageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PackageFormModal } from "./package-form-modal";

type PackageType = "curated" | "plan";

type PackageListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  package_type: PackageType;
  price_cents: number;
  compare_at_cents: number | null;
  currency: string;
  save_label: string | null;
  badge: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  items_count: number;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function PackagesModulePage() {
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PackageType>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/packages?status=${statusFilter}&type=${typeFilter}&page=1&pageSize=100`,
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await res.json();
        if (!res.ok)
          throw new Error(result.error ?? "Failed to load packages.");
        if (!isMounted) return;
        setPackages((result.data ?? []) as PackageListItem[]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        toast.error(
          error instanceof Error ? error.message : "Failed to load packages.",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [statusFilter, typeFilter, refreshKey]);

  const toggleActive = async (packageId: string) => {
    const actionKey = `${packageId}:toggle`;
    setPendingAction(actionKey);

    try {
      const res = await fetch(`/api/admin/packages/${packageId}/toggle`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to toggle package.");
      toast.success("Package status updated.");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle package.",
      );
    } finally {
      setPendingAction((current) => (current === actionKey ? null : current));
    }
  };

  const deletePackage = async (pkg: Pick<PackageListItem, "id" | "name">) => {
    if (!window.confirm(`Delete "${pkg.name}"? This cannot be undone.`)) {
      return;
    }

    const actionKey = `${pkg.id}:delete`;
    setPendingAction(actionKey);

    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to delete package.");
      toast.success("Package deleted.");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete package.",
      );
    } finally {
      setPendingAction((current) => (current === actionKey ? null : current));
    }
  };

  const handleSaveSuccess = () => {
    setShowCreateModal(false);
    setEditingPackage(null);
    setRefreshKey((k) => k + 1);
  };

  const totalActive = packages.filter((p) => p.is_active).length;
  const totalCurated = packages.filter(
    (p) => p.package_type === "curated",
  ).length;
  const totalPlans = packages.filter((p) => p.package_type === "plan").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages Module</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage service packages and membership plans with bundled pricing.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#6B4423] hover:bg-[#4A2C1A] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Package
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Packages",
            value: packages.length,
            sub: "All packages in the system",
          },
          {
            label: "Active",
            value: totalActive,
            sub: "Currently available to customers",
          },
          { label: "Curated", value: totalCurated, sub: "Service bundles" },
          { label: "Plans", value: totalPlans, sub: "Membership plans" },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          >
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Catalog section */}
      <div
        className="bg-white rounded-xl border border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      >
        {/* Catalog header + filters */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Catalog</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Filter packages, edit details, and manage activation status.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as typeof typeFilter)
              }
              className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none"
            >
              <option value="all">All types</option>
              <option value="curated">Curated</option>
              <option value="plan">Plan</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading && (
          <p className="text-sm text-gray-400 py-10 text-center">
            Loading packages...
          </p>
        )}

        {!loading && packages.length === 0 && (
          <p className="text-sm text-gray-400 py-10 text-center">
            No packages match the current filters.{" "}
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[#6B4423] hover:underline"
            >
              Create one
            </button>
            .
          </p>
        )}

        {!loading &&
          packages.map((pkg, idx) => {
            const toggleActionKey = `${pkg.id}:toggle`;
            const deleteActionKey = `${pkg.id}:delete`;
            const isTogglePending = pendingAction === toggleActionKey;
            const isDeletePending = pendingAction === deleteActionKey;
            const isBusy = pendingAction?.startsWith(`${pkg.id}:`) ?? false;

            return (
              <div
                key={pkg.id}
                className={cn(
                  "flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors",
                  idx !== packages.length - 1 && "border-b border-gray-100",
                )}
              >
                {/* Left: name + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {pkg.name}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        pkg.package_type === "curated"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-purple-50 text-purple-700 border border-purple-200",
                      )}
                    >
                      {pkg.package_type}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        pkg.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200",
                      )}
                    >
                      {pkg.is_active ? "Active" : "Inactive"}
                    </span>
                    {pkg.badge && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#C9A96E]/15 text-[#6B4423] border border-[#C9A96E]/30">
                        {pkg.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatPrice(pkg.price_cents, pkg.currency)}
                    {pkg.compare_at_cents && (
                      <span className="line-through ml-2">
                        {formatPrice(pkg.compare_at_cents, pkg.currency)}
                      </span>
                    )}{" "}
                    • {pkg.items_count} item{pkg.items_count !== 1 ? "s" : ""} •
                    Sort: {pkg.sort_order}
                  </p>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingPackage(pkg.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => toggleActive(pkg.id)}
                    disabled={isBusy}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                      pkg.is_active
                        ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                        : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50",
                    )}
                  >
                    {isTogglePending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : pkg.is_active ? (
                      <PowerOff className="w-3.5 h-3.5" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}{" "}
                    {pkg.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => deletePackage(pkg)}
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
            );
          })}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <PackageFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSaveSuccess}
        />
      )}
      {editingPackage && (
        <PackageFormModal
          packageId={editingPackage}
          onClose={() => setEditingPackage(null)}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}
