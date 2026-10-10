"use client";

import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingActionDialogs } from "./booking-action-dialogs";
import { BookingDetailsSheet } from "./booking-details-sheet";
import { BookingsTable } from "./bookings-table";
import { BookingsToolbar } from "./bookings-toolbar";
import { StatCard } from "./stat-card";
import { useAdminBookingsQueue } from "../hooks/use-admin-bookings-queue";

export function BookingsList() {
  const queue = useAdminBookingsQueue();

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Bookings Queue</h1>
            <p className="mt-1 text-base text-muted-foreground">
              Triage live bookings with real filters, actions, and audit context.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={queue.triggerReload}
            disabled={queue.refreshing}
            className="w-full gap-2 rounded-xl border-gray-200 bg-white shadow-sm sm:w-auto"
          >
            {queue.refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Bookings" value={queue.stats.total} colorClassName="text-foreground" />
          <StatCard label="Pending" value={queue.stats.pending} colorClassName="text-amber-500" />
          <StatCard label="Confirmed" value={queue.stats.confirmed} colorClassName="text-emerald-600" />
          <StatCard label="Completed" value={queue.stats.completed} colorClassName="text-blue-600" />
        </div>

        <BookingsToolbar
          selectedDate={queue.selectedDate}
          setSelectedDate={queue.setSelectedDate}
          isDatePickerOpen={queue.isDatePickerOpen}
          setIsDatePickerOpen={queue.setIsDatePickerOpen}
          search={queue.search}
          setSearch={queue.setSearch}
          sort={queue.sort}
          setSort={queue.setSort}
          channel={queue.channel}
          setChannel={queue.setChannel}
          showFilters={queue.showFilters}
          setShowFilters={queue.setShowFilters}
          activeFiltersCount={queue.activeFiltersCount}
          loadingFilters={queue.loadingFilters}
          filters={queue.filters}
          branchId={queue.branchId}
          setBranchId={queue.setBranchId}
          specialistId={queue.specialistId}
          setSpecialistId={queue.setSpecialistId}
          serviceId={queue.serviceId}
          setServiceId={queue.setServiceId}
          clearFilters={queue.clearFilters}
        />

        {queue.selectedIds.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-[#6B4423]/10 bg-[#6B4423]/5 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {queue.selectedIds.length} booking{queue.selectedIds.length === 1 ? "" : "s"} selected
              </p>
              <p className="text-sm text-muted-foreground">
                Run the existing bulk approval or bulk rejection flow from this queue.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => queue.openRejectDialog({ mode: "bulk", ids: queue.selectedIds })}
                disabled={queue.actionBusyKey === "reject:bulk"}
              >
                {queue.actionBusyKey === "reject:bulk" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Bulk reject
              </Button>
              <Button
                className="bg-[#3E2723] text-white hover:bg-[#52342d]"
                onClick={() => void queue.handleBulkApprove()}
                disabled={queue.actionBusyKey === "approve:bulk"}
              >
                {queue.actionBusyKey === "approve:bulk" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Bulk approve
              </Button>
            </div>
          </div>
        ) : null}

        <BookingsTable
          activeTab={queue.activeTab}
          setActiveTab={queue.setActiveTab}
          loadingPage={queue.loadingPage}
          pageError={queue.pageError}
          bookings={queue.bookings}
          allVisibleSelected={queue.allVisibleSelected}
          toggleSelectAll={queue.toggleSelectAll}
          selectedIds={queue.selectedIds}
          toggleSelection={queue.toggleSelection}
          setDetailBookingId={queue.setDetailBookingId}
          handleApprove={queue.handleApprove}
          handleComplete={queue.handleComplete}
          openRescheduleDialog={queue.openRescheduleDialog}
          openRejectDialog={queue.openRejectDialog}
          showingFrom={queue.showingFrom}
          showingTo={queue.showingTo}
          total={queue.total}
          page={queue.page}
          setPage={queue.setPage}
          totalPages={queue.totalPages}
          refreshing={queue.refreshing}
        />
      </div>

      <BookingDetailsSheet
        key={`${queue.detailBookingId ?? "empty"}:${queue.reloadKey}`}
        open={Boolean(queue.detailBookingId)}
        bookingId={queue.detailBookingId}
        sourceBooking={queue.selectedBooking}
        reloadKey={queue.reloadKey}
        onOpenChange={(open) => {
          if (!open) {
            queue.setDetailBookingId(null);
          }
        }}
        onApprove={queue.handleApprove}
        onReject={(booking) => queue.openRejectDialog({ mode: "single", booking })}
        onReschedule={queue.openRescheduleDialog}
        onComplete={queue.handleComplete}
        actionBusyKey={queue.actionBusyKey}
      />

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
    </>
  );
}
