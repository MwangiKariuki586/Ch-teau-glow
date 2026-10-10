import { addMinutes, formatISO, parseISO, subMinutes } from "date-fns";
import {
  SAME_DAY_LEAD_HOURS,
  SESSION_BUFFER_MINUTES,
} from "@/lib/bookings/availability-config";

export type AvailabilityWindow = {
  dayOfWeek: number;
  start: string;
  end: string;
  slotMinutes: number;
};

type ExistingBookingWindow = {
  starts_at: string;
  ends_at: string;
};

type BuildAvailableSlotsParams = {
  availability: unknown;
  date: string;
  bookingDurationMinutes: number;
  existingBookings?: ExistingBookingWindow[];
  tzOffsetMinutes?: number;
  admin?: boolean;
  now?: Date;
};

const DEFAULT_WINDOW_START = "09:00";
const DEFAULT_WINDOW_END = "17:00";
const DEFAULT_SLOT_MINUTES = 30;

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

export function formatDateInOffset(date: Date, offsetMinutes: number) {
  const shifted = new Date(date.getTime() - offsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toUtcFromOffsetLocal(
  date: string,
  hhmm: string,
  offsetMinutes: number,
) {
  const { year, month, day } = parseDateParts(date);
  const [hour, minute] = hhmm.split(":").map(Number);
  const utcMillis =
    Date.UTC(year, month - 1, day, hour, minute, 0) + offsetMinutes * 60_000;
  return new Date(utcMillis);
}

export function getUtcDayRangeFromOffsetLocal(date: string, offsetMinutes: number) {
  const start = toUtcFromOffsetLocal(date, "00:00", offsetMinutes);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function getWeekdayForLocalDate(date: string) {
  const { year, month, day } = parseDateParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function parseWeekday(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value >= 0 && value <= 6 ? value : null;
  }

  if (typeof value !== "string") return null;

  const lowered = value.trim().toLowerCase();
  const map: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };

  return map[lowered] ?? null;
}

export function parseAvailability(value: unknown): AvailabilityWindow[] {
  if (!Array.isArray(value)) return [];

  const windows: AvailabilityWindow[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;

    const row = entry as Record<string, unknown>;
    if (row.is_available === false || row.isAvailable === false) continue;

    const dayOfWeek = parseWeekday(
      row.dayOfWeek ?? row.day_of_week ?? row.day ?? row.weekday,
    );
    const start = String(row.start ?? row.start_time ?? row.from ?? "").trim();
    const end = String(row.end ?? row.end_time ?? row.to ?? "").trim();
    const slotMinutes = Number(
      row.slot_minutes ?? row.slotMinutes ?? DEFAULT_SLOT_MINUTES,
    );

    if (
      dayOfWeek === null ||
      !/^\d{2}:\d{2}$/.test(start) ||
      !/^\d{2}:\d{2}$/.test(end) ||
      Number.isNaN(slotMinutes) ||
      slotMinutes <= 0
    ) {
      continue;
    }

    windows.push({
      dayOfWeek,
      start,
      end,
      slotMinutes,
    });
  }

  return windows;
}

function getDefaultAvailabilityWindow(weekday: number): AvailabilityWindow[] {
  return [
    {
      dayOfWeek: weekday,
      start: DEFAULT_WINDOW_START,
      end: DEFAULT_WINDOW_END,
      slotMinutes: DEFAULT_SLOT_MINUTES,
    },
  ];
}

function getAdaptiveSlotStepMinutes(
  baseStepMinutes: number,
  bookingDurationMinutes: number,
) {
  const minStepFromDuration = bookingDurationMinutes + SESSION_BUFFER_MINUTES;
  if (baseStepMinutes <= 0) return minStepFromDuration;
  return Math.max(baseStepMinutes, minStepFromDuration);
}

export function buildAvailableSlotsForDate({
  availability,
  date,
  bookingDurationMinutes,
  existingBookings = [],
  tzOffsetMinutes = 0,
  admin = false,
  now = new Date(),
}: BuildAvailableSlotsParams) {
  if (!bookingDurationMinutes || bookingDurationMinutes <= 0) {
    return [];
  }

  const weekday = getWeekdayForLocalDate(date);
  const parsedAvailability = parseAvailability(availability);
  const availabilityWindows =
    parsedAvailability.length > 0
      ? parsedAvailability.filter((window) => window.dayOfWeek === weekday)
      : getDefaultAvailabilityWindow(weekday);

  if (availabilityWindows.length === 0) {
    return [];
  }

  const blocked = existingBookings.map((booking) => ({
    start: parseISO(booking.starts_at),
    end: parseISO(booking.ends_at),
  }));

  const slots: Array<{ starts_at: string; ends_at: string }> = [];
  const sameDayCutoff = addMinutes(now, SAME_DAY_LEAD_HOURS * 60);
  const isSelectedDateToday = formatDateInOffset(now, tzOffsetMinutes) === date;

  for (const window of availabilityWindows) {
    let cursor = toUtcFromOffsetLocal(date, window.start, tzOffsetMinutes);
    const windowEnd = toUtcFromOffsetLocal(date, window.end, tzOffsetMinutes);
    const stepMinutes = getAdaptiveSlotStepMinutes(
      window.slotMinutes,
      bookingDurationMinutes,
    );

    while (addMinutes(cursor, bookingDurationMinutes) <= windowEnd) {
      const slotStart = cursor;
      const slotEnd = addMinutes(slotStart, bookingDurationMinutes);
      const bufferedSlotStart = subMinutes(slotStart, SESSION_BUFFER_MINUTES);
      const bufferedSlotEnd = addMinutes(slotEnd, SESSION_BUFFER_MINUTES);

      const overlaps = blocked.some(
        (booking) =>
          bufferedSlotStart < booking.end && bufferedSlotEnd > booking.start,
      );

      const violatesLeadTime =
        !admin && isSelectedDateToday && slotStart < sameDayCutoff;
      const isPast = !admin && slotStart <= now;
      const exceedsWindowWithBuffer =
        !admin && addMinutes(slotEnd, SESSION_BUFFER_MINUTES) > windowEnd;

      if (!overlaps && !violatesLeadTime && !isPast && !exceedsWindowWithBuffer) {
        slots.push({
          starts_at: formatISO(slotStart),
          ends_at: formatISO(slotEnd),
        });
      }

      cursor = addMinutes(cursor, stepMinutes);
    }
  }

  return slots
    .filter(
      (slot, index, arr) =>
        arr.findIndex((candidate) => candidate.starts_at === slot.starts_at) ===
        index,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
