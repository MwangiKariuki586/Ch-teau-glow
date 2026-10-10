"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { STATUS_TABS } from "../lib/config";
import type {
  AdminBookingFiltersResponse,
  AdminBookingRow,
  AdminBookingsListResponse,
  AdminBookingsSort,
  CompletionAftercareDraft,
  CompleteTarget,
  RejectTarget,
  RescheduleTarget,
  StatsState,
  StatusTab,
} from "../lib/types";
import { buildListQuery, buildStatsQuery, fetchJson, toUserMessage } from "../lib/utils";
import { ALL_FILTER, PAGE_SIZE } from "../lib/config";

type CompleteBookingResponse = {
  data: {
    booking: {
      id: string;
      status: string;
    };
    aftercare: {
      scheduled_for: string;
      delay_hours: number;
      delay_minutes: number;
      status: string;
    };
  };
  warnings?: string[];
};

export function useAdminBookingsQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasLoadedRef = useRef(false);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [stats, setStats] = useState<StatsState>({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
  });
  const [filters, setFilters] = useState<AdminBookingFiltersResponse["data"]>({
    branches: [],
    specialists: [],
    services: [],
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AdminBookingsSort>("created_at_desc");
  const [channel, setChannel] = useState(ALL_FILTER);
  const [branchId, setBranchId] = useState(ALL_FILTER);
  const [specialistId, setSpecialistId] = useState(ALL_FILTER);
  const [serviceId, setServiceId] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<RescheduleTarget>(null);
  const [completeTarget, setCompleteTarget] = useState<CompleteTarget>(null);
  const [completionAftercare, setCompletionAftercare] = useState<CompletionAftercareDraft>({
    instructions: "",
    what_to_do: "",
    what_to_avoid: "",
    important_notes: "",
  });

  const debouncedSearch = useDebouncedValue(search, 300);
  const activeStatuses = useMemo(
    () => STATUS_TABS.find((tab) => tab.id === activeTab)?.statuses ?? [],
    [activeTab],
  );
  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === detailBookingId) ?? null,
    [bookings, detailBookingId],
  );
  const activeFiltersCount = [
    selectedDate !== null,
    channel !== ALL_FILTER,
    branchId !== ALL_FILTER,
    specialistId !== ALL_FILTER,
    serviceId !== ALL_FILTER,
  ].filter(Boolean).length;
  const allVisibleSelected =
    bookings.length > 0 && bookings.every((booking) => selectedIds.includes(booking.id));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(total, page * PAGE_SIZE);

  const loadFilterOptions = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const response = await fetchJson<AdminBookingFiltersResponse>("/api/admin/bookings/filters");
      setFilters(response.data);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? toUserMessage(error.message, "Filter options could not be loaded.")
          : "Filter options could not be loaded.";
      toast.error(message);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  const loadQueue = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoadingPage(true);
      }

      setPageError(null);

      try {
        const listQuery = buildListQuery({
          date: selectedDate,
          page,
          search: debouncedSearch,
          channel,
          branchId,
          specialistId,
          serviceId,
          statuses: activeStatuses,
          sort,
        });

        const statsBase = {
          date: selectedDate,
          channel,
          branchId,
          specialistId,
          serviceId,
        };

        const [listResponse, totalResponse, pendingResponse, confirmedResponse, completedResponse] =
          await Promise.all([
            fetchJson<AdminBookingsListResponse>(`/api/admin/bookings?${listQuery}`),
            fetchJson<AdminBookingsListResponse>(
              `/api/admin/bookings?${buildStatsQuery(statsBase)}`,
            ),
            fetchJson<AdminBookingsListResponse>(
              `/api/admin/bookings?${buildStatsQuery({
                ...statsBase,
                statuses: ["pending"],
              })}`,
            ),
            fetchJson<AdminBookingsListResponse>(
              `/api/admin/bookings?${buildStatsQuery({
                ...statsBase,
                statuses: ["confirmed"],
              })}`,
            ),
            fetchJson<AdminBookingsListResponse>(
              `/api/admin/bookings?${buildStatsQuery({
                ...statsBase,
                statuses: ["completed"],
              })}`,
            ),
          ]);

        setBookings(listResponse.data);
        setTotal(listResponse.total);
        setTotalPages(Math.max(1, listResponse.totalPages || 1));
        setStats({
          total: totalResponse.total,
          pending: pendingResponse.total,
          confirmed: confirmedResponse.total,
          completed: completedResponse.total,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? toUserMessage(error.message, "The bookings queue could not be loaded.")
            : "The bookings queue could not be loaded.";
        setPageError(message);
      } finally {
        setLoadingPage(false);
        setRefreshing(false);
      }
    },
    [activeStatuses, branchId, channel, debouncedSearch, page, selectedDate, serviceId, sort, specialistId],
  );

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, branchId, channel, debouncedSearch, selectedDate, serviceId, specialistId, sort]);

  useEffect(() => {
    const mode = hasLoadedRef.current ? "refresh" : "initial";
    hasLoadedRef.current = true;
    void loadQueue(mode);
  }, [loadQueue]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => bookings.some((booking) => booking.id === id)));
  }, [bookings]);

  useEffect(() => {
    const bookingId = searchParams.get("bookingId");
    setDetailBookingId(bookingId || null);
  }, [searchParams]);

  useEffect(() => {
    const tab = searchParams.get("tab") as StatusTab | null;
    const validTabs: StatusTab[] = ["all", "pending", "confirmed", "rescheduled", "completed", "cancelled"];
    setActiveTab(tab && validTabs.includes(tab) ? tab : "all");
  }, [searchParams]);

  const triggerReload = useCallback(() => {
    setReloadKey((value) => value + 1);
    void loadQueue("refresh");
  }, [loadQueue]);

  const setDetailBookingIdWithUrl = useCallback(
    (bookingId: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (bookingId) {
        nextParams.set("bookingId", bookingId);
      } else {
        nextParams.delete("bookingId");
      }
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
      setDetailBookingId(bookingId);
    },
    [pathname, router, searchParams],
  );

  const handleApprove = useCallback(
    async (booking: AdminBookingRow) => {
      setActionBusyKey(`approve:${booking.id}`);
      try {
        await fetchJson(`/api/admin/bookings/${booking.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "approve" }),
        });
        toast.success(`Booking for ${booking.customer.name} approved.`);
        triggerReload();
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? toUserMessage(error.message, "This booking could not be approved.")
            : "This booking could not be approved.";
        toast.error(message);
      } finally {
        setActionBusyKey(null);
      }
    },
    [triggerReload],
  );

  const handleComplete = useCallback(
    async (booking: AdminBookingRow) => {
      setCompleteTarget(booking);
      setCompletionAftercare({
        instructions: "",
        what_to_do: "",
        what_to_avoid: "",
        important_notes: "",
      });
    },
    [],
  );

  const handleCompleteSubmit = useCallback(async () => {
    if (!completeTarget) {
      return;
    }

    setActionBusyKey(`complete:${completeTarget.id}`);

    try {
      const response = await fetchJson<CompleteBookingResponse>(
        `/api/admin/bookings/${completeTarget.id}/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            aftercare: completionAftercare,
          }),
        },
      );
      toast.success(`Booking for ${completeTarget.customer.name} marked as completed.`);
      response.warnings?.forEach((warning) => {
        toast.warning(warning);
      });
      setCompleteTarget(null);
      setCompletionAftercare({
        instructions: "",
        what_to_do: "",
        what_to_avoid: "",
        important_notes: "",
      });
      triggerReload();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? toUserMessage(error.message, "This booking could not be marked as completed.")
          : "This booking could not be marked as completed.";
      toast.error(message);
    } finally {
      setActionBusyKey(null);
    }
  }, [completeTarget, completionAftercare, triggerReload]);

  const openRejectDialog = useCallback((target: RejectTarget) => {
    setRejectTarget(target);
  }, []);

  const handleRejectSubmit = useCallback(async (reason: string) => {
    if (!rejectTarget) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("A rejection reason is required.");
      return;
    }

    const busyKey =
      rejectTarget.mode === "single"
        ? `reject:${rejectTarget.booking.id}`
        : "reject:bulk";
    setActionBusyKey(busyKey);

    try {
      if (rejectTarget.mode === "single") {
        await fetchJson(`/api/admin/bookings/${rejectTarget.booking.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            action: "reject",
            reason: trimmedReason,
          }),
        });
        toast.success(`Booking for ${rejectTarget.booking.customer.name} rejected.`);
      } else {
        await fetchJson("/api/admin/bookings/bulk-reject", {
          method: "POST",
          body: JSON.stringify({
            booking_ids: rejectTarget.ids,
            reason: trimmedReason,
          }),
        });
        toast.success(`${rejectTarget.ids.length} booking${rejectTarget.ids.length === 1 ? "" : "s"} rejected.`);
        setSelectedIds([]);
      }

      setRejectTarget(null);
      triggerReload();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? toUserMessage(error.message, "The rejection could not be completed.")
          : "The rejection could not be completed.";
      toast.error(message);
    } finally {
      setActionBusyKey(null);
    }
  }, [rejectTarget, triggerReload]);

  const openRescheduleDialog = useCallback((booking: AdminBookingRow) => {
    setRescheduleTarget(booking);
  }, []);

  const handleRescheduleSubmit = useCallback(async (params: {
    startsAt: string;
    endsAt: string;
    reason: string;
    tzOffsetMinutes: number;
  }) => {
    if (!rescheduleTarget) return;

    const trimmedReason = params.reason.trim();
    if (!trimmedReason) {
      toast.error("A reschedule reason is required.");
      return;
    }

    if (!params.startsAt) {
      toast.error("Choose the new appointment time.");
      return;
    }

    const nextDate = new Date(params.startsAt);
    if (Number.isNaN(nextDate.getTime())) {
      toast.error("Choose a valid date and time.");
      return;
    }

    setActionBusyKey(`reschedule:${rescheduleTarget.id}`);

    try {
      await fetchJson(`/api/admin/bookings/${rescheduleTarget.id}/reschedule-request`, {
        method: "POST",
        body: JSON.stringify({
          proposed_starts_at: new Date(params.startsAt).toISOString(),
          proposed_ends_at: new Date(params.endsAt).toISOString(),
          reason: trimmedReason,
          tz_offset_minutes: params.tzOffsetMinutes,
        }),
      });
      toast.success(`Reschedule proposal sent to ${rescheduleTarget.customer.name}.`);
      setRescheduleTarget(null);
      triggerReload();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? toUserMessage(error.message, "The reschedule proposal could not be sent.")
          : "The reschedule proposal could not be sent.";
      toast.error(message);
    } finally {
      setActionBusyKey(null);
    }
  }, [rescheduleTarget, triggerReload]);

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one booking first.");
      return;
    }

    setActionBusyKey("approve:bulk");

    try {
      await fetchJson("/api/admin/bookings/bulk-approve", {
        method: "POST",
        body: JSON.stringify({
          booking_ids: selectedIds,
        }),
      });
      toast.success(`${selectedIds.length} booking${selectedIds.length === 1 ? "" : "s"} approved.`);
      setSelectedIds([]);
      triggerReload();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? toUserMessage(error.message, "The selected bookings could not be approved.")
          : "The selected bookings could not be approved.";
      toast.error(message);
    } finally {
      setActionBusyKey(null);
    }
  }, [selectedIds, triggerReload]);

  const clearFilters = useCallback(() => {
    setSelectedDate(null);
    setChannel(ALL_FILTER);
    setBranchId(ALL_FILTER);
    setSpecialistId(ALL_FILTER);
    setServiceId(ALL_FILTER);
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? bookings.map((booking) => booking.id) : []);
    },
    [bookings],
  );

  const toggleSelection = useCallback((bookingId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, bookingId])] : current.filter((id) => id !== bookingId),
    );
  }, []);

  return {
    bookings,
    stats,
    filters,
    selectedDate,
    setSelectedDate,
    isDatePickerOpen,
    setIsDatePickerOpen,
    activeTab,
    setActiveTab,
    showFilters,
    setShowFilters,
    search,
    setSearch,
    sort,
    setSort,
    channel,
    setChannel,
    branchId,
    setBranchId,
    specialistId,
    setSpecialistId,
    serviceId,
    setServiceId,
    page,
    setPage,
    total,
    totalPages,
    selectedIds,
    loadingPage,
    loadingFilters,
    refreshing,
    pageError,
    detailBookingId,
    setDetailBookingId: setDetailBookingIdWithUrl,
    reloadKey,
    actionBusyKey,
    rejectTarget,
    setRejectTarget,
    rescheduleTarget,
    setRescheduleTarget,
    completeTarget,
    setCompleteTarget,
    completionAftercare,
    setCompletionAftercare,
    activeStatuses,
    selectedBooking,
    activeFiltersCount,
    allVisibleSelected,
    showingFrom,
    showingTo,
    triggerReload,
    handleApprove,
    handleComplete,
    handleCompleteSubmit,
    openRejectDialog,
    handleRejectSubmit,
    openRescheduleDialog,
    handleRescheduleSubmit,
    handleBulkApprove,
    clearFilters,
    toggleSelectAll,
    toggleSelection,
  };
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}
