"use client";

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingScreen } from "@/components/loading-screen";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  PaymentStatusBadge,
  formatPaymentAmount,
} from "@/features/shared/payment";
import type { AdminBookingRow, StatusTab } from "../lib/types";
import { STATUS_TABS } from "../lib/config";
import {
  canApprove,
  canComplete,
  canReject,
  canReschedule,
  formatBookingDate,
  formatTimeRange,
} from "../lib/utils";
import { ChannelBadge } from "./channel-badge";
import { StatusBadge } from "./status-badge";

export function BookingsTable(props: {
  activeTab: StatusTab;
  setActiveTab: (value: StatusTab) => void;
  loadingPage: boolean;
  pageError: string | null;
  bookings: AdminBookingRow[];
  allVisibleSelected: boolean;
  toggleSelectAll: (checked: boolean) => void;
  selectedIds: string[];
  toggleSelection: (bookingId: string, checked: boolean) => void;
  setDetailBookingId: (value: string | null) => void;
  handleApprove: (booking: AdminBookingRow) => Promise<void>;
  handleComplete: (booking: AdminBookingRow) => Promise<void>;
  openRescheduleDialog: (booking: AdminBookingRow) => void;
  openRejectDialog: (target: {
    mode: "single";
    booking: AdminBookingRow;
  }) => void;
  showingFrom: number;
  showingTo: number;
  total: number;
  page: number;
  setPage: (value: number | ((value: number) => number)) => void;
  totalPages: number;
  refreshing: boolean;
}) {
  const {
    activeTab,
    setActiveTab,
    loadingPage,
    pageError,
    bookings,
    allVisibleSelected,
    toggleSelectAll,
    selectedIds,
    toggleSelection,
    setDetailBookingId,
    handleApprove,
    handleComplete,
    openRescheduleDialog,
    openRejectDialog,
    showingFrom,
    showingTo,
    total,
    page,
    setPage,
    totalPages,
    refreshing,
  } = props;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "border-[#C9A96E] text-[#B39358]"
                  : "border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {(loadingPage || refreshing) && !pageError ? (
        <div className="p-6">
          <LoadingScreen
            title={bookings.length > 0 ? "Updating bookings queue" : "Loading bookings queue"}
            description={
              bookings.length > 0
                ? "Refreshing the queue for the latest filters, search, and status tab."
                : "Fetching the current queue, stats, and day filters."
            }
          />
        </div>
      ) : pageError ? (
        <div className="p-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {pageError}
          </div>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                <TableHead className="w-12 pl-6">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(value) => toggleSelectAll(value === true)}
                    aria-label="Select all bookings on this page"
                  />
                </TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Service / Package</TableHead>
                <TableHead>Practitioner</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <CalendarClock className="h-12 w-12 text-muted-foreground/40" />
                      <p className="text-base font-medium text-foreground">
                        No bookings found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Adjust the current filters to broaden the queue.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className={cn(
                      "cursor-pointer hover:bg-[#FFF8F0]/60",
                      booking.requires_attention && "bg-amber-50/40",
                    )}
                    onClick={() => setDetailBookingId(booking.id)}
                  >
                    <TableCell
                      className="pl-6"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.includes(booking.id)}
                        onCheckedChange={(value) =>
                          toggleSelection(booking.id, value === true)
                        }
                        aria-label={`Select booking ${booking.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {formatBookingDate(booking.starts_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeRange(booking.starts_at, booking.ends_at)}
                        </p>
                        {booking.requires_attention ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            <ShieldAlert className="h-3 w-3" />
                            Needs attention
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {booking.customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.customer.email ?? "No email on file"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ChannelBadge channel={booking.booking_channel} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {booking.booking_kind === "package" && booking.package
                            ? booking.package.name
                            : booking.service.name}
                        </p>
                        {booking.booking_kind === "package" ? (
                          <p className="text-xs font-medium uppercase tracking-wide text-[#6B4423]/70">
                            Intake service: {booking.service.name}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {[
                            booking.branch.name,
                            booking.branch.city,
                            booking.branch.country,
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {booking.specialist.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.specialist.title ?? "Title unavailable"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {booking.duration_minutes} min
                    </TableCell>
                    <TableCell>
                      {booking.payment_status ? (
                        <div className="space-y-1">
                          <PaymentStatusBadge status={booking.payment_status} />
                          <p className="text-xs text-muted-foreground">
                            {formatPaymentAmount(
                              booking.payment_amount_cents,
                              booking.payment_currency,
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell
                      className="pr-6 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">
                              Open booking actions
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => setDetailBookingId(booking.id)}
                          >
                            View details
                          </DropdownMenuItem>
                          {canApprove(booking.status) ? (
                            <DropdownMenuItem
                              onClick={() => void handleApprove(booking)}
                            >
                              Approve booking
                            </DropdownMenuItem>
                          ) : null}
                          {canComplete(booking.status) ? (
                            <DropdownMenuItem
                              onClick={() => void handleComplete(booking)}
                            >
                              Mark complete
                            </DropdownMenuItem>
                          ) : null}
                          {canReschedule(booking.status) ? (
                            <DropdownMenuItem
                              onClick={() => openRescheduleDialog(booking)}
                            >
                              Reschedule
                            </DropdownMenuItem>
                          ) : null}
                          {canReject(booking.status) ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-700 focus:text-rose-700"
                                onClick={() =>
                                  openRejectDialog({ mode: "single", booking })
                                }
                              >
                                Reject booking
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {showingFrom}-{showingTo} of {total} bookings
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || refreshing}
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
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages || refreshing}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
