"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Eye,
  Pencil,
  Power,
  PowerOff,
  Plus,
  Trash2,
  Loader2,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OfferFormModal } from "./offer-form-modal";

type OfferType = "percent_off" | "fixed_credit" | "free_gift" | "other";

type OfferTarget = {
  id: string;
  target_type: "service" | "category" | "package" | "all_services";
  target_id: string | null;
  include: boolean;
};

type OfferListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  offer_type: OfferType;
  code: string | null;
  value_numeric: number | null;
  currency: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  eligibility_summary: string | null;
  cta_label: string | null;
  image_url: string | null;
  targets: OfferTarget[];
};

function formatOfferValue(
  type: OfferType,
  value: number | null,
  currency: string,
) {
  if (value === null) return "—";
  if (type === "percent_off") return `${value}% off`;
  if (type === "fixed_credit") return `${currency} ${value} credit`;
  return "—";
}

function formatTargetSummary(targets: OfferTarget[]) {
  if (targets.length === 0) return "No targets";
  const allServices = targets.find((t) => t.target_type === "all_services");
  if (allServices) return "All services";

  const counts = targets.reduce(
    (acc, t) => {
      acc[t.target_type] = (acc[t.target_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const parts: string[] = [];
  if (counts.service)
    parts.push(`${counts.service} service${counts.service > 1 ? "s" : ""}`);
  if (counts.category)
    parts.push(
      `${counts.category} categor${counts.category > 1 ? "ies" : "y"}`,
    );
  if (counts.package)
    parts.push(`${counts.package} package${counts.package > 1 ? "s" : ""}`);

  return parts.join(", ") || "No targets";
}

function formatDateRange(starts: string | null, ends: string | null) {
  if (!starts && !ends) return "Always active";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (starts && ends) return `${fmt(starts)} – ${fmt(ends)}`;
  if (starts) return `From ${fmt(starts)}`;
  if (ends) return `Until ${fmt(ends)}`;
  return "—";
}

export function OffersModulePage() {
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [hasCodeFilter, setHasCodeFilter] = useState<"all" | "yes" | "no">(
    "all",
  );
  const [dateFilter, setDateFilter] = useState<
    "all" | "active" | "upcoming" | "expired"
  >("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferListItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      console.log("=== FRONTEND FETCH DEBUG ===");
      console.log("Fetching offers with filters:", {
        statusFilter,
        hasCodeFilter,
        dateFilter,
      });
      try {
        const url = `/api/admin/offers?status=${statusFilter}&hasCode=${hasCodeFilter}&dateFilter=${dateFilter}&page=1&pageSize=100`;
        console.log("Fetch URL:", url);
        const res = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        console.log("Response status:", res.status);
        const result = await res.json();
        console.log("Response data:", result);
        if (!res.ok) throw new Error(result.error ?? "Failed to load offers.");
        if (!isMounted) return;
        console.log("Setting offers:", result.data);
        setOffers((result.data ?? []) as OfferListItem[]);
        console.log("Offers set successfully, count:", result.data?.length);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          console.log("Fetch aborted");
          return;
        }
        console.error("Fetch error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load offers.",
        );
      } finally {
        if (isMounted) setLoading(false);
        console.log("=== END FRONTEND DEBUG ===");
      }
    };

    void fetchData();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [statusFilter, hasCodeFilter, dateFilter, refreshKey]);

  const toggleActive = async (offerId: string) => {
    const actionKey = `${offerId}:toggle`;
    setPendingAction(actionKey);

    try {
      const res = await fetch(`/api/admin/offers/${offerId}/toggle`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to toggle offer.");
      toast.success("Offer status updated.");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle offer.",
      );
    } finally {
      setPendingAction((current) => (current === actionKey ? null : current));
    }
  };

  const deleteOffer = async (offer: Pick<OfferListItem, "id" | "title">) => {
    if (!window.confirm(`Delete "${offer.title}"? This cannot be undone.`)) {
      return;
    }

    const actionKey = `${offer.id}:delete`;
    setPendingAction(actionKey);

    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to delete offer.");
      toast.success("Offer deleted.");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete offer.",
      );
    } finally {
      setPendingAction((current) => (current === actionKey ? null : current));
    }
  };

  const handleSaveSuccess = () => {
    setShowCreateModal(false);
    setEditingOffer(null);
    setRefreshKey((k) => k + 1);
  };

  const totalActive = offers.filter((o) => o.is_active).length;
  const totalWithCode = offers.filter((o) => o.code).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offers Module</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage promotional offers with flexible targeting across services,
            categories, and packages.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#6B4423] hover:bg-[#4A2C1A] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Offer
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Offers",
            value: offers.length,
            sub: "All offers in the system",
          },
          {
            label: "Active",
            value: totalActive,
            sub: "Currently available to customers",
          },
          {
            label: "With Code",
            value: totalWithCode,
            sub: "Require promo code entry",
          },
          {
            label: "Filtered",
            value: offers.length,
            sub: "Matching current filters",
          },
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
              Filter offers, edit details, and manage activation status.
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
              value={hasCodeFilter}
              onChange={(e) =>
                setHasCodeFilter(e.target.value as typeof hasCodeFilter)
              }
              className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none"
            >
              <option value="all">All codes</option>
              <option value="yes">With code</option>
              <option value="no">No code</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) =>
                setDateFilter(e.target.value as typeof dateFilter)
              }
              className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none"
            >
              <option value="all">All dates</option>
              <option value="active">Currently active</option>
              <option value="upcoming">Upcoming</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading && (
          <p className="text-sm text-gray-400 py-10 text-center">
            Loading offers...
          </p>
        )}

        {!loading && offers.length === 0 && (
          <p className="text-sm text-gray-400 py-10 text-center">
            No offers match the current filters.{" "}
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
          offers.map((offer, idx) => {
            const toggleActionKey = `${offer.id}:toggle`;
            const deleteActionKey = `${offer.id}:delete`;
            const isTogglePending = pendingAction === toggleActionKey;
            const isDeletePending = pendingAction === deleteActionKey;
            const isBusy = pendingAction?.startsWith(`${offer.id}:`) ?? false;

            return (
              <div
                key={offer.id}
                className={cn(
                  "flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors",
                  idx !== offers.length - 1 && "border-b border-gray-100",
                )}
              >
                {/* Left: name + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {offer.title}
                    </span>
                    {offer.code && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {offer.code}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        offer.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200",
                      )}
                    >
                      {offer.is_active ? "Active" : "Inactive"}
                    </span>
                    {offer.badge && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#C9A96E]/15 text-[#6B4423] border border-[#C9A96E]/30">
                        {offer.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatOfferValue(
                      offer.offer_type,
                      offer.value_numeric,
                      offer.currency,
                    )}{" "}
                    • {formatTargetSummary(offer.targets)} •{" "}
                    {formatDateRange(offer.starts_at, offer.ends_at)} •
                    Priority: {offer.priority}
                  </p>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingOffer(offer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => toggleActive(offer.id)}
                    disabled={isBusy}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                      offer.is_active
                        ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                        : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50",
                    )}
                  >
                    {isTogglePending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : offer.is_active ? (
                      <PowerOff className="w-3.5 h-3.5" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}{" "}
                    {offer.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteOffer(offer)}
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
        <OfferFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSaveSuccess}
        />
      )}
      {editingOffer && (
        <OfferFormModal
          offer={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}
