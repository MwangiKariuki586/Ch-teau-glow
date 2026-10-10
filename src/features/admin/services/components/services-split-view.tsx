"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SERVICE_STATUSES } from "@/lib/constants/service-status";
import type { ServiceStatus } from "@/lib/constants/service-status";
import { useServicesQueue } from "../hooks/use-services-queue";
import { ServiceListCard } from "./service-list-card";
import { ServiceDetailPanel } from "./service-detail-panel";
import { ServiceEditPanel } from "./service-edit-panel";

const STATUS_LABELS: Record<"all" | ServiceStatus, string> = {
  all: "All statuses",
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

export function ServicesSplitView() {
  const queue = useServicesQueue();
  const [editServiceId, setEditServiceId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const isEditing = Boolean(editServiceId);

  const handleEdit = (serviceId: string) => {
    setEditServiceId(serviceId);
  };

  const handleEditClose = () => {
    setEditServiceId(null);
  };

  const handleEditSuccess = () => {
    setEditServiceId(null);
    setReloadKey((k) => k + 1);
    queue.triggerReload();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        {/* Page header */}
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Service Catalogue
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage services, publish states, and branch assignments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={queue.triggerReload}
                  disabled={queue.refreshing}
                  className="gap-2 rounded-xl border-gray-200 bg-white shadow-sm"
                >
                  {queue.refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reload the service catalogue</TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              className="gap-2 rounded-xl bg-[#3E2723] text-white hover:bg-[#52342d] shadow-sm"
              asChild
            >
              <Link href="/admin/services/new">
                <Plus className="h-4 w-4" />
                New Service
              </Link>
            </Button>
          </div>
        </div>

        {/* Three-column panel — CSS grid for smooth column animation */}
        <div
          className="grid min-h-0 flex-1 gap-3 overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out"
          style={{
            gridTemplateColumns: isEditing
              ? "288px minmax(0,1fr) minmax(0,1.4fr)"
              : "288px minmax(0,1fr) 0px",
          }}
        >
          {/* ── Col 1: List ── */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* Toolbar */}
            <div className="shrink-0 space-y-2 border-b border-gray-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queue.search}
                  onChange={(e) => queue.setSearch(e.target.value)}
                  placeholder="Search services..."
                  className="rounded-xl border-gray-200 bg-gray-50 pl-9 text-sm h-9"
                />
                {queue.search && (
                  <button
                    type="button"
                    onClick={() => queue.setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 flex-1 justify-between gap-1 rounded-lg border-gray-200 text-xs font-normal",
                        queue.statusFilter !== "all" && "border-[#C9A96E] bg-[#FFF4E2] text-[#6B4423]",
                      )}
                    >
                      <span className="truncate">{STATUS_LABELS[queue.statusFilter]}</span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem
                      onClick={() => queue.setStatusFilter("all")}
                      className={cn("text-sm", queue.statusFilter === "all" && "font-medium text-[#6B4423]")}
                    >
                      All statuses
                    </DropdownMenuItem>
                    {SERVICE_STATUSES.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => queue.setStatusFilter(s)}
                        className={cn("text-sm capitalize", queue.statusFilter === s && "font-medium text-[#6B4423]")}
                      >
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 flex-1 justify-between gap-1 rounded-lg border-gray-200 text-xs font-normal",
                        queue.categoryFilter !== "all" && "border-[#C9A96E] bg-[#FFF4E2] text-[#6B4423]",
                      )}
                    >
                      <span className="truncate">
                        {queue.categoryFilter === "all"
                          ? "All categories"
                          : (queue.categories.find((c) => c.id === queue.categoryFilter)?.name ?? "Category")}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onClick={() => queue.setCategoryFilter("all")}
                      className={cn("text-sm", queue.categoryFilter === "all" && "font-medium text-[#6B4423]")}
                    >
                      All categories
                    </DropdownMenuItem>
                    {queue.categories.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => queue.setCategoryFilter(c.id)}
                        className={cn("text-sm", queue.categoryFilter === c.id && "font-medium text-[#6B4423]")}
                      >
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Service cards */}
            <ScrollArea className="h-full flex-1 min-h-0">
              {queue.loading ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Loading services…</p>
                </div>
              ) : queue.error ? (
                <div className="p-4">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    {queue.error}
                  </div>
                </div>
              ) : queue.services.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">No services found</p>
                  <p className="text-xs text-muted-foreground">Adjust filters or create a new service.</p>
                </div>
              ) : (
                <div className={cn("relative", queue.refreshing && "pointer-events-none")}>
                  {queue.refreshing && (
                    <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/60 pt-8">
                      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Updating…</span>
                      </div>
                    </div>
                  )}
                  {queue.services.map((service) => (
                    <ServiceListCard
                      key={service.id}
                      service={service}
                      isSelected={queue.selectedServiceId === service.id}
                      onClick={() => {
                        queue.setSelectedServiceId(service.id);
                        // Close edit panel when switching services
                        if (editServiceId && editServiceId !== service.id) {
                          setEditServiceId(null);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            <div className="shrink-0 border-t border-gray-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {queue.pagination.total === 0
                    ? "No results"
                    : `${queue.showingFrom}–${queue.showingTo} of ${queue.pagination.total}`}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => queue.setPage((p) => Math.max(1, p - 1))}
                    disabled={queue.page <= 1 || queue.refreshing}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[50px] text-center text-xs text-muted-foreground">
                    {queue.page} / {Math.max(queue.pagination.totalPages, 1)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => queue.setPage((p) => Math.min(queue.pagination.totalPages, p + 1))}
                    disabled={queue.page >= queue.pagination.totalPages || queue.refreshing}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Col 2: Detail/View ── */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <ServiceDetailPanel
              serviceId={queue.selectedServiceId}
              reloadKey={reloadKey}
              pendingAction={queue.pendingAction}
              isEditing={isEditing}
              onEdit={handleEdit}
              onUpdateStatus={queue.updateStatus}
              onDelete={queue.deleteService}
            />
          </div>

          {/* ── Col 3: Edit form — slides in via grid column width ── */}
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm",
              "transition-[opacity] duration-300 ease-in-out",
              isEditing ? "opacity-100" : "opacity-0 pointer-events-none border-transparent shadow-none",
            )}
          >
            {editServiceId && (
              <ServiceEditPanel
                serviceId={editServiceId}
                onClose={handleEditClose}
                onSuccess={handleEditSuccess}
              />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
