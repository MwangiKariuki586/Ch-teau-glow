'use client';

import { addDays, startOfWeek, format, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { buildDaySlots } from '../utils/schedule-slots';
import type { ScheduleBooking, ScheduleSpecialist } from '../hooks/use-specialist-schedule';

const WEEK_DAYS = 7;

interface Props {
  weekStart: Date;
  specialist: ScheduleSpecialist;
  bookings: ScheduleBooking[];
  selectedDate: Date;
  onDayClick: (date: Date) => void;
  onSlotClick: (booking: ScheduleBooking | null) => void;
}

export function ScheduleWeekView({ weekStart, specialist, bookings, selectedDate, onDayClick, onSlotClick }: Props) {
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i));

  // Collect all unique time labels across all working days
  const allTimes = new Set<string>();
  days.forEach(day => {
    buildDaySlots(day, specialist.availability, bookings).forEach(s => allTimes.add(s.time));
  });
  const sortedTimes = [...allTimes].sort();

  if (!sortedTimes.length) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        No working hours configured for this week.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="w-16 py-2 text-left text-muted-foreground font-normal pl-4">Time</th>
            {days.map(day => (
              <th key={day.toISOString()} className="py-2 text-center font-medium min-w-[90px]">
                <button
                  onClick={() => onDayClick(day)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 mx-auto px-2 py-1 rounded-lg transition-colors',
                    isSameDay(day, selectedDate) && 'bg-primary text-primary-foreground',
                    isToday(day) && !isSameDay(day, selectedDate) && 'text-primary font-bold',
                    !isSameDay(day, selectedDate) && 'hover:bg-muted',
                  )}
                >
                  <span>{format(day, 'EEE')}</span>
                  <span className="text-base leading-none">{format(day, 'd')}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTimes.map(time => (
            <tr key={time} className="border-t border-border/50">
              <td className="pl-4 py-1.5 text-muted-foreground font-mono whitespace-nowrap">
                {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
              </td>
              {days.map(day => {
                const slots = buildDaySlots(day, specialist.availability, bookings);
                const slot = slots.find(s => s.time === time);

                if (!slot) {
                  return <td key={day.toISOString()} className="py-1.5 px-1 bg-muted/20" />;
                }

                const isBooked = !!slot.booking;
                return (
                  <td key={day.toISOString()} className="py-1 px-1">
                    <button
                      disabled={!isBooked}
                      onClick={() => isBooked && onSlotClick(slot.booking)}
                      className={cn(
                        'w-full rounded px-1.5 py-1 text-left transition-colors truncate',
                        isBooked
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 cursor-pointer'
                          : 'bg-emerald-50 text-emerald-700 cursor-default',
                      )}
                      title={isBooked ? slot.booking!.customer_name : 'Available'}
                    >
                      {isBooked ? (
                        <span className="truncate block">{slot.booking!.customer_name.split(' ')[0]}</span>
                      ) : (
                        <span className="opacity-60">Free</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
