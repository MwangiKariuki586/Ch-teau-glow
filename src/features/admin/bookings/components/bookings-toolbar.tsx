"use client";

import { startOfDay } from "date-fns";
import { CalendarDays, Filter, Search, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/loading-screen";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ALL_FILTER, BOOKING_CHANNEL_OPTIONS, SORT_OPTIONS } from "../lib/config";
import type { AdminBookingFiltersResponse, AdminBookingsSort } from "../lib/types";
import { formatDateLabel } from "../lib/utils";

export function BookingsToolbar(props: {
  selectedDate: Date | null;
  setSelectedDate: (value: Date | null) => void;
  isDatePickerOpen: boolean;
  setIsDatePickerOpen: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  sort: AdminBookingsSort;
  setSort: (value: AdminBookingsSort) => void;
  channel: string;
  setChannel: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean | ((value: boolean) => boolean)) => void;
  activeFiltersCount: number;
  loadingFilters: boolean;
  filters: AdminBookingFiltersResponse["data"];
  branchId: string;
  setBranchId: (value: string) => void;
  specialistId: string;
  setSpecialistId: (value: string) => void;
  serviceId: string;
  setServiceId: (value: string) => void;
  clearFilters: () => void;
}) {
  const {
    selectedDate,
    setSelectedDate,
    isDatePickerOpen,
    setIsDatePickerOpen,
    search,
    setSearch,
    sort,
    setSort,
    channel,
    setChannel,
    showFilters,
    setShowFilters,
    activeFiltersCount,
    loadingFilters,
    filters,
    branchId,
    setBranchId,
    specialistId,
    setSpecialistId,
    serviceId,
    setServiceId,
    clearFilters,
  } = props;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Queue Filters</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter the queue by date, channel, branch, service, specialist, or customer search.
        </p>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedDate !== null ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-9 rounded-lg px-4",
                    selectedDate !== null
                      ? "bg-[#3E2723] text-white hover:bg-[#52342d]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  Date
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto rounded-2xl border-gray-200 p-3 shadow-xl">
                <div className="space-y-3">
                  <div className="px-1">
                    <p className="text-sm font-medium text-foreground">Select a date</p>
                    <p className="text-xs text-muted-foreground">
                      Keeps the same date-based filtering logic already used by the queue.
                    </p>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate ?? undefined}
                    onSelect={(date) => {
                      setSelectedDate(date ?? null);
                      if (date) {
                        setIsDatePickerOpen(false);
                      }
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
                        setIsDatePickerOpen(false);
                      }}
                    >
                      Today
                    </Button>
                    {selectedDate ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(null);
                          setIsDatePickerOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {selectedDate ? (
            <div className="flex h-11 items-center rounded-xl border border-gray-200 bg-white shadow-sm">
              <Button
                variant="ghost"
                onClick={() => setIsDatePickerOpen(true)}
                className="h-11 rounded-r-none rounded-l-xl border-0 px-3 text-foreground hover:bg-muted/60"
              >
                <CalendarDays className="h-4 w-4 text-[#6B4423]" />
                <span>{formatDateLabel(selectedDate)}</span>
              </Button>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B4423]/30"
                aria-label="Clear selected date"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, booking, service..."
              className="rounded-xl border-gray-200 bg-white pl-9 shadow-sm"
            />
          </div>
          <Select value={sort} onValueChange={(value) => setSort(value as AdminBookingsSort)}>
            <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 bg-white shadow-sm sm:w-[220px]">
              <SelectValue placeholder="Sort bookings" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showFilters || activeFiltersCount > 0 ? "default" : "outline"}
            onClick={() => setShowFilters((current) => !current)}
            className={cn(
              "rounded-xl shadow-sm",
              showFilters || activeFiltersCount > 0
                ? "bg-[#3E2723] text-white hover:bg-[#52342d]"
                : "border-gray-200 bg-white",
            )}
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeFiltersCount > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-semibold text-[#3E2723]">
                {activeFiltersCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {showFilters ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Advanced filters</p>
              <p className="text-sm text-muted-foreground">
                Narrow the queue without leaving the current date.
              </p>
            </div>
            {activeFiltersCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            ) : null}
          </div>

          {loadingFilters ? (
            <LoadingScreen
              compact
              title="Loading filters"
              description="Preparing branches, services, specialists, and channel options."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Channel
                </label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="w-full rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER}>All channels</SelectItem>
                    {BOOKING_CHANNEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Branch
                </label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="w-full rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER}>All branches</SelectItem>
                    {filters.branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Specialist
                </label>
                <Select value={specialistId} onValueChange={setSpecialistId}>
                  <SelectTrigger className="w-full rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="All specialists" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER}>All specialists</SelectItem>
                    {filters.specialists.map((specialist) => (
                      <SelectItem key={specialist.id} value={specialist.id}>
                        {specialist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Service
                </label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger className="w-full rounded-xl border-gray-200 bg-white">
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER}>All services</SelectItem>
                    {filters.services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
