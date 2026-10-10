import { addDays, format, parseISO, startOfDay } from "date-fns";
import type { BookingStatus } from "@/lib/constants/booking-status";
import { ALL_FILTER, BOOKING_CHANNEL_OPTIONS, DEFAULT_BOOKING_CHANNEL, PAGE_SIZE } from "./config";
import type {
  AdminBookingsSort,
  BookingChannel,
  EntityOrArray,
} from "./types";

export function toSingle<T>(value: EntityOrArray<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export function toUserMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;

  const lowered = message.toLowerCase();
  const technicalFragments = [
    "violates",
    "syntax error",
    "pgrst",
    "relation",
    "stack",
    "duplicate key",
    "constraint",
    "null value",
    "failed to fetch",
    "unexpected token",
  ];

  if (technicalFragments.some((fragment) => lowered.includes(fragment))) {
    return fallback;
  }

  return message;
}

export function buildListQuery(params: {
  date: Date | null;
  page: number;
  search: string;
  channel: string;
  branchId: string;
  specialistId: string;
  serviceId: string;
  statuses: BookingStatus[];
  sort: AdminBookingsSort;
}) {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("pageSize", String(PAGE_SIZE));
  query.set("sort", params.sort);
  query.set("tab", "all");

  if (params.date) {
    query.set("date_from", startOfDay(params.date).toISOString());
    query.set("date_to", addDays(startOfDay(params.date), 1).toISOString());
  }
  if (params.search.trim()) {
    query.set("q", params.search.trim());
  }
  if (params.channel !== ALL_FILTER) {
    query.set("channel", params.channel);
  }
  if (params.branchId !== ALL_FILTER) {
    query.set("branch_id", params.branchId);
  }
  if (params.specialistId !== ALL_FILTER) {
    query.set("specialist_id", params.specialistId);
  }
  if (params.serviceId !== ALL_FILTER) {
    query.set("service_id", params.serviceId);
  }
  params.statuses.forEach((status) => query.append("status", status));

  return query.toString();
}

export function buildStatsQuery(params: {
  date: Date | null;
  channel: string;
  branchId: string;
  specialistId: string;
  serviceId: string;
  statuses?: BookingStatus[];
}) {
  const query = new URLSearchParams();
  query.set("page", "1");
  query.set("pageSize", "1");
  query.set("sort", "starts_at_asc");
  query.set("tab", "all");

  if (params.date) {
    query.set("date_from", startOfDay(params.date).toISOString());
    query.set("date_to", addDays(startOfDay(params.date), 1).toISOString());
  }
  if (params.channel !== ALL_FILTER) {
    query.set("channel", params.channel);
  }
  if (params.branchId !== ALL_FILTER) {
    query.set("branch_id", params.branchId);
  }
  if (params.specialistId !== ALL_FILTER) {
    query.set("specialist_id", params.specialistId);
  }
  if (params.serviceId !== ALL_FILTER) {
    query.set("service_id", params.serviceId);
  }
  params.statuses?.forEach((status) => query.append("status", status));

  return query.toString();
}

export function canApprove(status: BookingStatus) {
  return status === "pending" || status === "rescheduled";
}

export function canReject(status: BookingStatus) {
  return status === "pending" || status === "confirmed" || status === "rescheduled";
}

export function canReschedule(status: BookingStatus) {
  return status === "pending" || status === "confirmed" || status === "rescheduled";
}

export function canComplete(status: BookingStatus) {
  return status === "confirmed" || status === "rescheduled";
}

export function formatDateLabel(date: Date | null) {
  return date ? format(date, "EEE, MMM d") : "All dates";
}

export function formatDateTime(value: string) {
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : format(date, "MMM d, yyyy h:mm a");
}

export function formatBookingDate(value: string) {
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : format(date, "MMM d, yyyy");
}

export function formatTimeRange(start: string, end: string) {
  const startsAt = parseISO(start);
  const endsAt = parseISO(end);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return "Unknown";
  }

  return `${format(startsAt, "h:mm a")} – ${format(endsAt, "h:mm a")}`;
}

export function toDateTimeLocalValue(value: string) {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

const bookingChannelSet = new Set<BookingChannel>(BOOKING_CHANNEL_OPTIONS.map((option) => option.value));

export function normalizeBookingChannel(value: string | null | undefined): BookingChannel {
  if (value && bookingChannelSet.has(value as BookingChannel)) {
    return value as BookingChannel;
  }

  return DEFAULT_BOOKING_CHANNEL;
}

export function formatBookingChannelLabel(channel: BookingChannel) {
  return (
    BOOKING_CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ??
    BOOKING_CHANNEL_OPTIONS[0].label
  );
}

export function formatBookingChannelMeta(meta: Record<string, unknown> | null | undefined) {
  if (!meta || Array.isArray(meta)) {
    return [];
  }

  return Object.entries(meta).flatMap(([key, value]) => {
    const formattedValue = formatChannelMetaValue(value);
    if (!formattedValue) {
      return [];
    }

    return [
      {
        key,
        label: key
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (character) => character.toUpperCase()),
        value: formattedValue,
      },
    ];
  });
}

function formatChannelMetaValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatChannelMetaValue(item))
      .filter((item): item is string => Boolean(item));
    return items.length > 0 ? items.join(", ") : null;
  }

  return null;
}

