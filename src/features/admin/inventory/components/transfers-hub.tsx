"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Send,
  PackageCheck,
  XCircle,
  Loader2,
  ArrowRightLeft,
  Search,
  Filter,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { InventoryTransfer, TransferStatus, Branch } from "../types";
import { transferStatusLabel, transferStatusColor, formatDate } from "../utils";
import { CreateTransferDrawer } from "./create-transfer-drawer";
import { TransferDetailsDrawer } from "./transfer-details-drawer";

// ── Config ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type TabId = "all" | TransferStatus;

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "In Transit" },
  { id: "received", label: "Received" },
  { id: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS = [
  { value: "created_desc", label: "Newest created" },
  { value: "created_asc", label: "Oldest created" },
  { value: "sent_asc", label: "Sent: oldest first" },
  { value: "received_desc", label: "Received: latest first" },
];

const STATUS_OPTIONS: { value: TransferStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "In Transit" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTopItems(t: InventoryTransfer): string {
  const items = t.inventory_transfer_items ?? [];
  if (items.length === 0) return "—";
  const first = items[0].inventory_items?.name ?? "Item";
  if (items.length === 1) return first;
  return `${first} +${items.length - 1} more`;
}

function getTimelineValue(t: InventoryTransfer, tab: TabId): string {
  if (tab === "sent" && t.sent_at) return formatDate(t.sent_at);
  if (tab === "received" && t.received_at) return formatDate(t.received_at);
  if (tab === "all") {
    if (t.received_at) return formatDate(t.received_at);
    if (t.sent_at) return formatDate(t.sent_at);
  }
  return formatDate(t.created_at);
}

function getTimelineLabel(tab: TabId): string {
  if (tab === "sent") return "Sent";
  if (tab === "received") return "Received";
  return "Created";
}

interface ListResponse {
  data: InventoryTransfer[];
  total: number;
  totalPages: number;
  page: number;
}

function resolveTab(value: string | null): TabId {
  if (value === "draft" || value === "received" || value === "cancelled") {
    return value;
  }
  if (value === "sent" || value === "in-transit") {
    return "sent";
  }
  return "all";
}

// ── Component ────────────────────────────────────────────────────────────────

export function TransfersHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(() => resolveTab(searchParams.get("tab")));
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Toolbar state
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(() => searchParams.get("overdue") === "1");

  // Filter panel state
  const [fromBranchId, setFromBranchId] = useState("all");
  const [toBranchId, setToBranchId] = useState("all");
  const [selectedStatuses, setSelectedStatuses] = useState<TransferStatus[]>(
    [],
  );
  const [branches, setBranches] = useState<Branch[]>([]);

  // Drawers
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTransfer, setDetailTransfer] =
    useState<InventoryTransfer | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/branches")
      .then((r) => r.json())
      .then((j) => setBranches(j.data ?? []))
      .catch(() => {});
  }, []);

  const activeFiltersCount = [
    fromBranchId !== "all",
    toBranchId !== "all",
    selectedStatuses.length > 0,
    overdueOnly,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFromBranchId("all");
    setToBranchId("all");
    setSelectedStatuses([]);
    setPage(1);
  };

  const updateTransferQueryParam = useCallback(
    (transferId?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (transferId) {
        params.set("transfer", transferId);
      } else {
        params.delete("transfer");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openTransferDetails = useCallback(
    (transfer: InventoryTransfer) => {
      setDetailTransfer(transfer);
      updateTransferQueryParam(transfer.id);
    },
    [updateTransferQueryParam],
  );

  const closeTransferDetails = useCallback(() => {
    updateTransferQueryParam(null);
  }, [updateTransferQueryParam]);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: tab,
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
      });

      if (search.trim()) params.set("q", search.trim());
      if (fromBranchId !== "all") params.set("from_branch_id", fromBranchId);
      if (toBranchId !== "all") params.set("to_branch_id", toBranchId);
      if (selectedStatuses.length > 0 && selectedStatuses.length < 4) {
        params.set("statuses", selectedStatuses.join(","));
      }
      if (overdueOnly) params.set("overdue", "1");
      if (selectedDate) {
        params.set("date_from", startOfDay(selectedDate).toISOString());
        params.set(
          "date_to",
          addDays(startOfDay(selectedDate), 1).toISOString(),
        );
      }

      const res = await fetch(`/api/admin/inventory/transfers?${params}`);
      const json: ListResponse = await res.json();
      setTransfers(json.data ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 0);
    } catch {
      toast.error("Failed to load transfers.");
    } finally {
      setLoading(false);
    }
  }, [
    tab,
    page,
    search,
    sort,
    fromBranchId,
    toBranchId,
    selectedStatuses,
    overdueOnly,
    selectedDate,
  ]);

  useEffect(() => {
    const t = setTimeout(fetchTransfers, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchTransfers, search]);

  useEffect(() => {
    const nextTab = resolveTab(searchParams.get("tab"));
    const nextOverdueOnly = searchParams.get("overdue") === "1";
    const focusedTransferId = searchParams.get("transfer");

    if (nextTab !== tab) {
      setTab(nextTab);
      setPage(1);
    }
    if (nextOverdueOnly !== overdueOnly) {
      setOverdueOnly(nextOverdueOnly);
      setPage(1);
    }
    if (!focusedTransferId) {
      if (detailTransfer) {
        setDetailTransfer(null);
      }
      return;
    }

    const nextSearch = focusedTransferId.slice(0, 8);
    if (!search.trim()) {
      setSearch(nextSearch);
    }

    const focusedTransfer = transfers.find((transfer) => transfer.id === focusedTransferId);
    if (focusedTransfer && detailTransfer?.id !== focusedTransfer.id) {
      setDetailTransfer(focusedTransfer);
    }
  }, [detailTransfer?.id, overdueOnly, search, searchParams, tab, transfers]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSend = async (id: string) => {
    if (
      !confirm(
        "Send this transfer? Stock will be deducted from the source branch.",
      )
    )
      return;
    setActionBusy(id);
    try {
      const res = await fetch(`/api/admin/inventory/transfers/${id}/send`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send.");
      toast.success("Transfer sent. Stock deducted from source branch.");
      setDetailTransfer(null);
      fetchTransfers();
    } catch (err: unknown) {
      toast.error("Failed to send transfer.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionBusy(null);
    }
  };

  const handleReceive = async (id: string) => {
    if (
      !confirm(
        "Mark as received? Stock will be added to the destination branch.",
      )
    )
      return;
    setActionBusy(id);
    try {
      const res = await fetch(`/api/admin/inventory/transfers/${id}/receive`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to receive.");
      toast.success("Transfer received. Stock added to destination branch.");
      setDetailTransfer(null);
      fetchTransfers();
    } catch (err: unknown) {
      toast.error("Failed to receive transfer.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionBusy(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this transfer?")) return;
    setActionBusy(id);
    try {
      const res = await fetch(`/api/admin/inventory/transfers/${id}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to cancel.");
      toast.success("Transfer cancelled.");
      setDetailTransfer(null);
      fetchTransfers();
    } catch (err: unknown) {
      toast.error("Failed to cancel transfer.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setActionBusy(null);
    }
  };

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {/* Left: date filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              <Button
                variant={selectedDate === null ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 rounded-lg px-4",
                  selectedDate === null
                    ? "bg-[#3E2723] text-white hover:bg-[#52342d]"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setSelectedDate(null)}
              >
                All
              </Button>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={selectedDate !== null ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-9 rounded-lg px-4 gap-1.5",
                      selectedDate !== null
                        ? "bg-[#3E2723] text-white hover:bg-[#52342d]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Date
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto rounded-2xl border-gray-200 p-3 shadow-xl"
                >
                  <div className="space-y-3">
                    <p className="px-1 text-sm font-medium">Select a date</p>
                    <Calendar
                      mode="single"
                      selected={selectedDate ?? undefined}
                      onSelect={(date) => {
                        setSelectedDate(date ?? null);
                        if (date) setDatePickerOpen(false);
                        setPage(1);
                      }}
                      className="rounded-xl border border-gray-100"
                    />
                    <div className="flex items-center justify-between gap-2 px-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-gray-200"
                        onClick={() => {
                          setSelectedDate(startOfDay(new Date()));
                          setDatePickerOpen(false);
                          setPage(1);
                        }}
                      >
                        Today
                      </Button>
                      {selectedDate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(null);
                            setDatePickerOpen(false);
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && (
              <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-white shadow-sm">
                <Button
                  variant="ghost"
                  onClick={() => setDatePickerOpen(true)}
                  className="h-11 rounded-r-none rounded-l-xl border-0 px-3 text-foreground hover:bg-muted/60 gap-1.5"
                >
                  <CalendarDays className="h-4 w-4 text-[#6B4423]" />
                  {format(selectedDate, "EEE, MMM d")}
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right: search + sort + filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, branch, item…"
                className="rounded-xl border-gray-200 bg-white pl-9 shadow-sm"
              />
            </div>
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 bg-white shadow-sm sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={
                showFilters || activeFiltersCount > 0 ? "default" : "outline"
              }
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "rounded-xl shadow-sm",
                showFilters || activeFiltersCount > 0
                  ? "bg-[#3E2723] text-white hover:bg-[#52342d]"
                  : "border-gray-200 bg-white",
              )}
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFiltersCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-semibold text-[#3E2723]">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            {overdueOnly && (
              <Button
                variant="outline"
                onClick={() => {
                  setOverdueOnly(false);
                  setPage(1);
                }}
                className="rounded-xl border-amber-200 bg-amber-50 text-amber-700 shadow-sm"
              >
                Overdue only
              </Button>
            )}
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Advanced filters</p>
                <p className="text-sm text-muted-foreground">
                  Narrow transfers by branch, status, or date.
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  From Branch
                </label>
                <Select
                  value={fromBranchId}
                  onValueChange={(v) => {
                    setFromBranchId(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  To Branch
                </label>
                <Select
                  value={toBranchId}
                  onValueChange={(v) => {
                    setToBranchId(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => {
                        setSelectedStatuses((prev) =>
                          prev.includes(s.value)
                            ? prev.filter((x) => x !== s.value)
                            : [...prev, s.value],
                        );
                        setPage(1);
                      }}
                      className={cn(
                        "inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                        selectedStatuses.includes(s.value)
                          ? "bg-[#3E2723] text-white border-[#3E2723]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Table card */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Tabs */}
        <div className="border-b border-gray-100 px-6">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setPage(1);
                }}
                className={cn(
                  "border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors",
                  tab === t.id
                    ? "border-[#C9A96E] text-[#B39358]"
                    : "border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#6B4423]" />
            Loading transfers…
          </div>
        ) : transfers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
              <ArrowRightLeft className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-base font-medium text-foreground">
                {tab === "all"
                  ? "No transfers found"
                  : `No ${transferStatusLabel(tab as TransferStatus).toLowerCase()} transfers`}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "all" || tab === "draft"
                  ? "Create a new transfer to get started."
                  : "Adjust filters to broaden the results."}
              </p>
              {(tab === "all" || tab === "draft") && (
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white mt-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Transfer
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                <TableHead>{getTimelineLabel(tab)}</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-[#FFF8F0]/60"
                  onClick={() => openTransferDetails(t)}
                >
                  {/* Timeline */}
                  <TableCell>
                    <p className="font-medium text-foreground text-sm">
                      {getTimelineValue(t, tab)}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {t.id.slice(0, 8)}…
                    </p>
                  </TableCell>

                  {/* Route */}
                  <TableCell>
                    <p className="font-medium text-foreground text-sm">
                      {t.from_branch?.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      → {t.to_branch?.name ?? "—"}
                    </p>
                  </TableCell>

                  {/* Items */}
                  <TableCell>
                    <p className="text-sm text-foreground">
                      {t.inventory_transfer_items?.length ?? 0} item
                      {(t.inventory_transfer_items?.length ?? 0) !== 1
                        ? "s"
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-[160px] truncate">
                      {getTopItems(t)}
                    </p>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs rounded-full px-2.5 py-0.5 font-medium",
                        transferStatusColor(t.status),
                      )}
                    >
                      {transferStatusLabel(t.status)}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell
                    className="pr-6 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Transfer actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openTransferDetails(t)}>
                          View details
                        </DropdownMenuItem>
                        {t.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => handleSend(t.id)}
                            disabled={actionBusy === t.id}
                          >
                            <Send className="h-3.5 w-3.5 mr-2" />
                            Send transfer
                          </DropdownMenuItem>
                        )}
                        {t.status === "sent" && (
                          <DropdownMenuItem
                            onClick={() => handleReceive(t.id)}
                            disabled={actionBusy === t.id}
                          >
                            <PackageCheck className="h-3.5 w-3.5 mr-2" />
                            Mark received
                          </DropdownMenuItem>
                        )}
                        {(t.status === "draft" || t.status === "sent") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-700 focus:text-rose-700"
                              onClick={() => handleCancel(t.id)}
                              disabled={actionBusy === t.id}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-2" />
                              Cancel transfer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {!loading && transfers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {showingFrom}–{showingTo} of {total} transfers
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="min-w-[90px] text-center">
                Page {page} of {Math.max(totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Drawers */}
      <CreateTransferDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          fetchTransfers();
        }}
      />
      <TransferDetailsDrawer
        transfer={detailTransfer}
        open={!!detailTransfer}
        onOpenChange={(o) => !o && closeTransferDetails()}
        actionBusy={actionBusy}
        onSend={handleSend}
        onReceive={handleReceive}
        onCancel={handleCancel}
      />
    </div>
  );
}
