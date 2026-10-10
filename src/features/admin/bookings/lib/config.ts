import type { BookingStatus } from "@/lib/constants/booking-status";
import type { AdminBookingsSort, BookingChannel, StatusTab } from "./types";

export const PAGE_SIZE = 10;
export const ALL_FILTER = "all";
export const DEFAULT_BOOKING_CHANNEL: BookingChannel = "web";

export const BOOKING_CHANNEL_OPTIONS: Array<{
  value: BookingChannel;
  label: string;
}> = [
  { value: "web", label: "Web" },
  { value: "admin", label: "Admin" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "partner", label: "Partner" },
  { value: "api", label: "API" },
  { value: "other", label: "Other" },
];

export const SORT_OPTIONS: Array<{
  value: AdminBookingsSort;
  label: string;
}> = [
  { value: "starts_at_asc", label: "Time: earliest first" },
  { value: "starts_at_desc", label: "Time: latest first" },
  { value: "attention", label: "Needs attention" },
  { value: "created_at_desc", label: "Newest created" },
  { value: "created_at_asc", label: "Oldest created" },
  { value: "age_desc", label: "Oldest pending first" },
];

export const STATUS_TABS: Array<{
  id: StatusTab;
  label: string;
  statuses: BookingStatus[];
}> = [
  { id: "all", label: "All", statuses: [] },
  { id: "pending", label: "Pending", statuses: ["pending"] },
  { id: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { id: "rescheduled", label: "Rescheduled", statuses: ["rescheduled"] },
  { id: "completed", label: "Completed", statuses: ["completed"] },
  { id: "cancelled", label: "Cancelled", statuses: ["cancelled", "rejected", "no_show"] },
];

export const STATUS_META: Record<
  BookingStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    className: "border-gray-200 bg-gray-100 text-gray-700",
  },
  confirmed: {
    label: "Confirmed",
    className: "border-blue-200 bg-blue-100 text-blue-800",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-rose-200 bg-rose-100 text-rose-800",
  },
  rejected: {
    label: "Rejected",
    className: "border-rose-200 bg-rose-100 text-rose-800",
  },
  completed: {
    label: "Completed",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  no_show: {
    label: "No Show",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  rescheduled: {
    label: "Rescheduled",
    className: "border-violet-200 bg-violet-100 text-violet-800",
  },
};
