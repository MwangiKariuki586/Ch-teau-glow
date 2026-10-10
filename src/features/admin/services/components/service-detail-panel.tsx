"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  WandSparkles,
  Package,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingScreen } from "@/components/loading-screen";
import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/constants/service-status";

type ServiceDetail = {
  id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
  is_featured: boolean;
  category_id: string;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
  duration_minutes: number;
  cover_image_url: string | null;
  what_is_it: string;
  who_is_it_for: string | null;
  who_is_it_not_for: string | null;
  results_duration: string | null;
  discomfort_level: string | null;
  side_effects: string | null;
  recovery_duration: string | null;
  downtime: string | null;
  branch_ids: string[];
};

const STATUS_CLASSES: Record<ServiceStatus, string> = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-gray-200 bg-gray-100 text-gray-600",
  archived: "border-rose-200 bg-rose-50 text-rose-600",
};

function formatPrice(min: number, max: number, currency: string) {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return min === max ? fmt.format(min / 100) : `${fmt.format(min / 100)} – ${fmt.format(max / 100)}`;
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export function ServiceDetailPanel({
  serviceId,
  reloadKey,
  pendingAction,
  isEditing,
  onEdit,
  onUpdateStatus,
  onDelete,
}: {
  serviceId: string | null;
  reloadKey: number;
  pendingAction: string | null;
  isEditing: boolean;
  onEdit: (serviceId: string) => void;
  onUpdateStatus: (serviceId: string, status: ServiceStatus) => void;
  onDelete: (serviceId: string, name: string) => void;
}) {
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) {
      setDetail(null);
      setError(null);
      return;
    }
    setDetail(null);
    setError(null);

    const controller = new AbortController();
    fetch(`/api/admin/services/${serviceId}`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.error) throw new Error(result.error);
        setDetail(result.data as ServiceDetail);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load service.");
      });

    return () => controller.abort();
  }, [serviceId, reloadKey]);

  if (!serviceId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-base font-medium text-foreground">Select a service</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Click any service from the list to view its details and available actions.
        </p>
      </div>
    );
  }

  const loading = !detail && !error;
  const isBusy = (key: string) => pendingAction === key;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-100 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              {detail?.name ?? "Service Details"}
            </h2>
          </div>
          {detail && (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                STATUS_CLASSES[detail.status],
              )}
            >
              {detail.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="h-full flex-1 min-h-0">
        {loading ? (
          <div className="p-6">
            <LoadingScreen compact title="Loading service" description="Fetching service details." />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          </div>
        ) : detail ? (
          <div className="space-y-4 p-6">
            {detail.cover_image_url && (
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <img
                  src={detail.cover_image_url}
                  alt={detail.name}
                  className="h-40 w-full object-cover"
                />
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow
                  label="Price"
                  value={formatPrice(detail.min_price_cents, detail.max_price_cents, detail.currency)}
                />
                <DetailRow label="Duration" value={`${detail.duration_minutes} min`} />
                <DetailRow label="Slug" value={detail.slug} />
                {detail.is_featured && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Featured</p>
                    <p className="mt-1 text-sm text-[#6B4423]">⭐ Featured service</p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Branches</p>
                  <p className="mt-1 text-sm text-foreground">
                    {detail.branch_ids.length === 0
                      ? "Not assigned to any branch"
                      : `${detail.branch_ids.length} branch${detail.branch_ids.length === 1 ? "" : "es"}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-foreground">Description</h3>
              <Separator />
              <DetailRow label="What is it?" value={detail.what_is_it} />
              <DetailRow label="Who is it for?" value={detail.who_is_it_for} />
              <DetailRow label="Who is it not for?" value={detail.who_is_it_not_for} />
            </div>

            {(detail.results_duration || detail.discomfort_level || detail.side_effects || detail.recovery_duration || detail.downtime) && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-foreground">Treatment Details</h3>
                <Separator />
                <DetailRow label="Results Duration" value={detail.results_duration} />
                <DetailRow label="Discomfort Level" value={detail.discomfort_level} />
                <DetailRow label="Side Effects" value={detail.side_effects} />
                <DetailRow label="Recovery Duration" value={detail.recovery_duration} />
                <DetailRow label="Downtime" value={detail.downtime} />
              </div>
            )}
          </div>
        ) : null}
      </ScrollArea>

      {/* Action footer */}
      {detail && (
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {/* Edit */}
            <Button
              size="sm"
              className={cn(
                "transition-colors",
                isEditing
                  ? "bg-[#C9A96E] text-[#3E2723] hover:bg-[#b8924f]"
                  : "bg-[#3E2723] text-white hover:bg-[#52342d]",
              )}
              onClick={() => onEdit(detail.id)}
            >
              <Pencil className="h-4 w-4" />
              {isEditing ? "Editing…" : "Edit"}
            </Button>

            {/* View live */}
            <Button variant="outline" size="sm" asChild>
              <a href={`/services/${detail.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                View live
              </a>
            </Button>

            {/* Publish / Archive */}
            {detail.status === "published" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus(detail.id, "archived")}
                disabled={isBusy(`${detail.id}:status`)}
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                {isBusy(`${detail.id}:status`) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Archive
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus(detail.id, "published")}
                disabled={isBusy(`${detail.id}:status`)}
              >
                {isBusy(`${detail.id}:status`) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="h-4 w-4" />
                )}
                Publish
              </Button>
            )}

            {/* Delete — AlertDialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy(`${detail.id}:delete`)}
                  className="ml-auto text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  {isBusy(`${detail.id}:delete`) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete service?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="font-medium text-foreground">{detail.name}</span> will be
                    permanently removed. Services with existing bookings cannot be deleted — archive
                    them instead.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(detail.id, detail.name)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
