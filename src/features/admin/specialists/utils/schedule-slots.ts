import { format, parseISO, addMinutes, isSameDay } from 'date-fns';
import type { ScheduleBooking } from '../hooks/use-specialist-schedule';

export interface TimeSlot {
  time: string;       // "09:00"
  label: string;      // "09:00 AM"
  booking: ScheduleBooking | null;
  isWorking: boolean;
}

const DAY_NAME_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

export function buildDaySlots(
  date: Date,
  availability: Array<{ day: string; is_available: boolean; start_time: string; end_time: string }> | null,
  bookings: ScheduleBooking[]
): TimeSlot[] {
  const dayIndex = date.getDay();
  const avail = (availability ?? []).find(a => DAY_NAME_MAP[a.day] === dayIndex);
  const isWorking = avail?.is_available ?? false;

  // Generate 30-min slots across the full working window (or 08:00–20:00 fallback)
  const startHHMM = isWorking ? avail!.start_time : '08:00';
  const endHHMM   = isWorking ? avail!.end_time   : '20:00';

  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);

  const slots: TimeSlot[] = [];
  let cursor = new Date(date);
  cursor.setHours(sh, sm, 0, 0);
  const end = new Date(date);
  end.setHours(eh, em, 0, 0);

  const dayBookings = bookings.filter(b => isSameDay(parseISO(b.starts_at), date));

  while (cursor < end) {
    const hhmm = format(cursor, 'HH:mm');
    const label = format(cursor, 'hh:mm a');
    const slotEnd = addMinutes(cursor, 30);

    // Find a booking that overlaps this 30-min window
    const booking = dayBookings.find(b => {
      const bs = parseISO(b.starts_at);
      const be = parseISO(b.ends_at);
      return bs < slotEnd && be > cursor;
    }) ?? null;

    slots.push({ time: hhmm, label, booking, isWorking });
    cursor = addMinutes(cursor, 30);
  }

  return slots;
}

export function formatSlotTime(isoString: string): string {
  return format(parseISO(isoString), 'h:mm a');
}
