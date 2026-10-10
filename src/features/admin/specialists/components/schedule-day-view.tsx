'use client';

import { format, isToday } from 'date-fns';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { buildDaySlots } from '../utils/schedule-slots';
import { useNow } from '../hooks/use-now';
import type { ScheduleBooking, ScheduleSpecialist } from '../hooks/use-specialist-schedule';

interface Props {
  date: Date;
  specialist: ScheduleSpecialist;
  bookings: ScheduleBooking[];
  onSlotClick: (booking: ScheduleBooking | null) => void;
}

/** Returns 0–1 progress through a 30-min slot for the current time indicator */
function slotProgress(slotTime: string, now: Date, dateStr: string): number | null {
  const slotStart = new Date(`${dateStr}T${slotTime}:00`);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60_000);
  if (now >= slotStart && now < slotEnd) {
    return (now.getTime() - slotStart.getTime()) / (30 * 60_000);
  }
  return null;
}

export function ScheduleDayView({ date, specialist, bookings, onSlotClick }: Props) {
  const now = useNow();
  const slots = buildDaySlots(date, specialist.availability, bookings);
  const showNowLine = isToday(date);
  const dateStr = format(date, 'yyyy-MM-dd');
  const nowRowRef = useRef<HTMLTableRowElement>(null);

  // Scroll current-time row into view on today, once slots are ready
  useEffect(() => {
    if (!showNowLine || !nowRowRef.current) return;
    nowRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showNowLine, slots.length]);

  if (!slots.length) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        No working hours configured for this day.
      </div>
    );
  }

  const seenBookingIds = new Set<string>();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="w-24 py-3 text-left text-muted-foreground font-normal pl-6">Time</th>
            <th className="py-3 text-center font-medium">
              <div className={cn(
                'inline-flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg',
                isToday(date) ? 'bg-primary text-primary-foreground' : 'text-gray-700',
              )}>
                <span>{format(date, 'EEEE')}</span>
                <span className="text-lg leading-none font-bold">{format(date, 'd')}</span>
                <span className="text-xs opacity-70">{format(date, 'MMM yyyy')}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {slots.map(slot => {
            const isBooked = !!slot.booking;
            const isContinuation = isBooked && seenBookingIds.has(slot.booking!.id);
            if (isBooked) seenBookingIds.add(slot.booking!.id);

            // Current-time indicator position within this slot (0–1), null if not in this slot
            const progress = showNowLine ? slotProgress(slot.time, now, dateStr) : null;
            const isPast = showNowLine && (() => {
              const slotStart = new Date(`${dateStr}T${slot.time}:00`);
              return now >= new Date(slotStart.getTime() + 30 * 60_000);
            })();

            return (
              <tr
                key={slot.time}
                ref={progress !== null ? nowRowRef : undefined}
                className="border-t border-border/50"
              >
                {/* Time label */}
                <td className={cn(
                  'pl-6 py-1.5 font-mono whitespace-nowrap',
                  isPast ? 'text-muted-foreground/40' : 'text-muted-foreground',
                )}>
                  {format(new Date(`2000-01-01T${slot.time}`), 'h:mm a')}
                </td>

                {/* Slot cell */}
                <td className="py-1 px-3 relative">
                  {isContinuation ? (
                    <div className={cn(
                      'w-full rounded px-3 py-2 bg-rose-50 text-rose-400 text-xs italic',
                      isPast && 'opacity-50',
                    )}>
                      — continued
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!isBooked}
                      onClick={() => isBooked && onSlotClick(slot.booking)}
                      className={cn(
                        'w-full rounded px-3 py-2 text-left transition-colors relative overflow-hidden',
                        isBooked
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 cursor-pointer'
                          : 'bg-emerald-50 text-emerald-700 cursor-default',
                        isPast && !isBooked && 'opacity-40',
                      )}
                    >
                      {isBooked ? (
                        <div>
                          <p className="font-medium truncate">{slot.booking!.customer_name}</p>
                          <p className="text-xs opacity-70 truncate">{slot.booking!.service_name}</p>
                        </div>
                      ) : (
                        <span className="opacity-70">Available</span>
                      )}
                    </button>
                  )}

                  {/* Real-time current position line */}
                  {progress !== null && (
                    <div
                      className="absolute left-3 right-3 flex items-center gap-1 pointer-events-none z-10"
                      style={{ top: `calc(${progress * 100}% )` }}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-sm" />
                      <div className="flex-1 h-px bg-rose-500 shadow-sm" />
                      <span className="text-[10px] font-semibold text-rose-500 bg-white px-1 rounded">
                        {format(now, 'h:mm a')}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
