"use client";

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS, STATUS_TABS } from "../lib/config";
import type { AdminBookingsSort, StatusTab } from "../lib/types";
import { formatDateLabel } from "../lib/utils";
import { useAdminBookingsQueue } from "../hooks/use-admin-bookings-queue";
import { BookingActionDialogs } from "./booking-action-dialogs";
import { BookingDetailPanel } from "./booking-detail-panel";
import { BookingListCard } from "./booking-list-card";

export function BookingsSplitView() {
  const queue = useAdminBookingsQueue();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        {/* Page header */}
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Bookings Queue
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Triage live bookings — select one to view details and take action.
            </p>
          </div>
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
            <TooltipContent>Reload the bookings queue</TooltipContent>
          </Tooltip>
        </div>

        {/* Split panel — fills remaining height, no outer scroll */}
        <div className="flex min-h-0 flex-1 overflow-hidden">

          {/* ── Left: list panel ── */}
          <div className="flex w-80 shrink-0 flex-col border border-gray-100 rounded-2xl bg-white shadow-sm xl:w-96 min-h-0">

            {/* Toolbar */}
            <div className="shrink-0 space-y-2 border-b border-gray-100 p-3">

              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queue.search}
                  onChange={(e) => queue.setSearch(e.target.value)}
                  placeholder="Search bookings..."
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

              {/* Status + Date + Sort row */}
              <div className="flex items-center gap-1.5">

                {/* Status filter dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 flex-1 justify-between gap-1 rounded-lg border-gray-200 text-xs font-normal",
                        queue.activeTab !== "all" && "border-[#C9A96E] bg-[#FFF4E2] text-[#6B4423]",
                      )}
                    >
                      <span className="truncate capitalize">
                        {STATUS_TABS.find((t) => t.id === queue.activeTab)?.label ?? "All"}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    {STATUS_TABS.map((tab) => (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => queue.setActiveTab(tab.id as StatusTab)}
                        className={cn(
                          "text-sm",
                          queue.activeTab === tab.id && "font-medium text-[#6B4423]",
                        )}
                      >
                        {tab.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Date picker */}
                <Popover open={queue.isDatePickerOpen} onOpenChange={queue.setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className={cn(
                            "h-8 w-8 shrink-0 rounded-lg border-gray-200",
                            queue.selectedDate && "border-[#C9A96E] bg-[#FFF4E2] text-[#6B4423]",
                          )}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {queue.selectedDate ? formatDateLabel(queue.selectedDate) : "Filter by date"}
                      </TooltipContent>
                    </Tooltip>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto rounded-2xl p-3 shadow-xl">
                    <Calendar
                      mode="single"
                      selected={queue.selectedDate ?? undefined}
                      onSelect={(date) => {
                        queue.setSelectedDate(date ?? null);
                        if (date) queue.setIsDatePickerOpen(false);
                      }}
                      className="rounded-xl border border-gray-100"
                    />
                    <div className="mt-2 flex gap-2 px-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-lg"
                        onClick={() => {
                          queue.setSelectedDate(startOfDay(new Date()));
                          queue.setIsDatePickerOpen(false);
                        }}
                      >
                        Today
                      </Button>
                      {queue.selectedDate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            queue.setSelectedDate(null);
                            queue.setIsDatePickerOpen(false);
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {queue.selectedDate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => queue.setSelectedDate(null)}
                        className="rounded-lg text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear date</TooltipContent>
                  </Tooltip>
                )}

                {/* Sort */}
                <Select
                  value={queue.sort}
                  onValueChange={(v) => queue.setSort(v as AdminBookingsSort)}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SelectTrigger className="h-8 w-8 shrink-0 rounded-lg border-gray-200 p-0 [&>svg]:hidden">
                        <span className="sr-only">Sort bookings</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mx-auto text-muted-foreground"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18M7 12h10M11 18h2" />
                        </svg>
                      </SelectTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Sort order</TooltipContent>
                  </Tooltip>
                  <SelectContent align="end">
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Booking cards — scrollable */}
            <ScrollArea className="h-full flex-1 min-h-0">
              {queue.loadingPage ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Loading bookings…</p>
                </div>
              ) : queue.pageError ? (
                <div className="p-4">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    {queue.pageError}
                  </div>
                </div>
              ) : queue.bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                  <CalendarClock className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">No bookings found</p>
                  <p className="text-xs text-muted-foreground">
                    Adjust filters to broaden the queue.
                  </p>
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
                  {queue.bookings.map((booking) => (
                    <BookingListCard
                      key={booking.id}
                      booking={booking}
                      isSelected={queue.detailBookingId === booking.id}
                      onClick={() => queue.setDetailBookingId(booking.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            <div className="shrink-0 border-t border-gray-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {queue.total === 0
                    ? "No results"
                    : `${queue.showingFrom}–${queue.showingTo} of ${queue.total}`}
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
                    {queue.page} / {Math.max(queue.totalPages, 1)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => queue.setPage((p) => Math.min(queue.totalPages, p + 1))}
                    disabled={queue.page >= queue.totalPages || queue.refreshing}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: detail panel ── */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <BookingDetailPanel
              bookingId={queue.detailBookingId}
              sourceBooking={queue.selectedBooking}
              reloadKey={queue.reloadKey}
              onApprove={queue.handleApprove}
              onReject={(booking) => queue.openRejectDialog({ mode: "single", booking })}
              onReschedule={queue.openRescheduleDialog}
              onComplete={queue.handleComplete}
              actionBusyKey={queue.actionBusyKey}
            />
          </div>
        </div>
      </div>

      <BookingActionDialogs
        rejectTarget={queue.rejectTarget}
        setRejectTarget={queue.setRejectTarget}
        handleRejectSubmit={queue.handleRejectSubmit}
        rescheduleTarget={queue.rescheduleTarget}
        setRescheduleTarget={queue.setRescheduleTarget}
        handleRescheduleSubmit={queue.handleRescheduleSubmit}
        completeTarget={queue.completeTarget}
        setCompleteTarget={queue.setCompleteTarget}
        completionAftercare={queue.completionAftercare}
        setCompletionAftercare={queue.setCompletionAftercare}
        handleCompleteSubmit={queue.handleCompleteSubmit}
        actionBusyKey={queue.actionBusyKey}
      />
    </TooltipProvider>
  );
}
