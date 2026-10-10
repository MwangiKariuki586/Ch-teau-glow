'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MantineProvider } from '@mantine/core';
import { Schedule, type ScheduleEventData } from '@mantine/schedule';
import { useSpecialistSchedule, type ScheduleBooking, type ScheduleSpecialist } from '../hooks/use-specialist-schedule';
import { ScheduleBookingDialog } from './schedule-booking-dialog';
// dayjs day index → availability day name
const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

// Brand colors mapped to booking statuses
const STATUS_COLOR: Record<string, string> = {
  confirmed:   '#6B4423',
  pending:     '#c9a961',
  rescheduled: '#a0522d',
  completed:   '#9e8a78',
  rejected:    '#b85c5c',
  cancelled:   '#b85c5c',
};

function getWorkingHours(specialist: ScheduleSpecialist | null): { startTime: string; endTime: string } {
  const working = (specialist?.availability ?? []).filter(a => a.is_available);
  if (!working.length) return { startTime: '08:00', endTime: '20:00' };
  const starts = working.map(a => a.start_time).sort();
  const ends   = working.map(a => a.end_time).sort();
  return { startTime: starts[0], endTime: ends[ends.length - 1] };
}

/** Build "Not Available" background events for off days in the visible 2-week window */
function buildOffDayEvents(specialist: ScheduleSpecialist | null, anchorDate: string): ScheduleEventData[] {
  if (!specialist?.availability) return [];

  // Parse YYYY-MM-DD safely without timezone ambiguity
  const [y, m, d] = anchorDate.split('-').map(Number);
  if (!y || !m || !d) return [];
  const anchor = new Date(y, m - 1, d, 12, 0, 0);
  if (isNaN(anchor.getTime())) return [];

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const events: ScheduleEventData[] = [];

  for (let i = 0; i < 14; i++) {
    const day = addDays(weekStart, i);
    const dayName = DAY_INDEX_TO_NAME[day.getDay()];
    const avail = specialist.availability.find(a => a.day === dayName);
    if (!avail || !avail.is_available) {
      const dateStr = format(day, 'yyyy-MM-dd');
      events.push({
        id: `off-${dateStr}`,
        title: 'Not Available',
        start: `${dateStr} 00:00:00`,
        end:   `${dateStr} 23:59:59`,
        color: '#9ca3af',
        display: 'background',
      });
    }
  }
  return events;
}

function toBookingEvent(b: ScheduleBooking): ScheduleEventData {
  return {
    id: b.id,
    title: `${b.customer_name} · ${b.service_name}`,
    // new Date() converts UTC ISO → local time, which is what we want for display
    start: format(new Date(b.starts_at), 'yyyy-MM-dd HH:mm:ss'),
    end:   format(new Date(b.ends_at),   'yyyy-MM-dd HH:mm:ss'),
    color: STATUS_COLOR[b.status] ?? '#6B4423',
    payload: { bookingId: b.id },
  };
}

interface Props {
  specialistId: string;
}

export function SpecialistSchedule({ specialistId }: Props) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBooking, setSelectedBooking] = useState<ScheduleBooking | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const { specialist, bookings, loading, error, refetch } = useSpecialistSchedule(
    specialistId, new Date(selectedDate), 'week'
  );

  const { startTime, endTime } = getWorkingHours(specialist);

  const events = useMemo<ScheduleEventData[]>(() => [
    ...bookings.map(toBookingEvent),
    ...buildOffDayEvents(specialist, selectedDate),
  ], [bookings, specialist, selectedDate]);

  function handleEventClick(event: ScheduleEventData) {
    // Ignore background off-day events
    if (String(event.id).startsWith('off-')) return;
    const booking = bookings.find(b => b.id === String(event.id));
    if (booking) { setSelectedBooking(booking); setBookingDialogOpen(true); }
  }

  return (
    <div className="-m-6">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/specialists"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>

        {specialist && (
          <div className="flex items-center gap-2.5">
            {specialist.image_url ? (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <Image src={specialist.image_url} alt={specialist.name} width={32} height={32} className="object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {specialist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-none">{specialist.name}</p>
              <p className="text-xs text-muted-foreground">{specialist.title}</p>
            </div>
          </div>
        )}

        <div className="ml-auto">
          <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <MantineProvider theme={{
        primaryColor: 'brand',
        colors: {
          brand: [
            '#f5ede4', '#e8d5c0', '#d4b08a', '#c9a961',
            '#a07040', '#6B4423', '#5a3a1e', '#4a2f18',
            '#3a2412', '#2a190d',
          ],
        },
      }}>
        <div className="p-4">
          <Schedule
            defaultView="week"
            date={selectedDate}
            onDateChange={setSelectedDate}
            events={events}
            onEventClick={handleEventClick}
            layout="responsive"
            dayViewProps={{ startTime, endTime, intervalMinutes: 30 }}
            weekViewProps={{ startTime, endTime, intervalMinutes: 30 }}
          />
        </div>
      </MantineProvider>

      <ScheduleBookingDialog
        booking={selectedBooking}
        open={bookingDialogOpen}
        onClose={() => setBookingDialogOpen(false)}
        onActionDone={() => { setBookingDialogOpen(false); refetch(); }}
        specialistId={specialistId}
      />
    </div>
  );
}
