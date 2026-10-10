export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "rejected",
  "completed",
  "no_show",
  "rescheduled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_DEFAULT_STATUS: BookingStatus = "pending";

export const BOOKING_CANCELLABLE_STATUSES = [
  "pending",
  "confirmed",
] as const satisfies readonly BookingStatus[];

export const BOOKING_NON_BLOCKING_STATUSES = [
  "cancelled",
  "rejected",
  "completed",
  "no_show",
] as const satisfies readonly BookingStatus[];

export const BOOKING_NON_BLOCKING_STATUS_FILTER = `(${BOOKING_NON_BLOCKING_STATUSES.join(",")})`;
