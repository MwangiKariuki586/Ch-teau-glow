'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

export interface ScheduleBooking {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  service_name: string;
  service_id: string | null;
  duration_minutes: number;
  branch_name: string | null;
  payment_status: string | null;
  booking_channel: string | null;
  created_at: string | null;
}

export interface ScheduleSpecialist {
  id: string;
  name: string;
  title: string;
  image_url: string | null;
  branch_id: string;
  availability: Array<{ day: string; is_available: boolean; start_time: string; end_time: string }> | null;
}

export type ViewMode = 'day' | 'week';

export function useSpecialistSchedule(specialistId: string, selectedDate: Date, viewMode: ViewMode) {
  const [specialist, setSpecialist] = useState<ScheduleSpecialist | null>(null);
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce date changes — avoid rapid re-fetches while navigating
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRangeRef = useRef<{ from: string; to: string } | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!specialistId) return;
    setLoading(true);
    setError(null);

    try {
      let dateFrom: string;
      let dateTo: string;

      if (viewMode === 'week') {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        dateFrom = format(weekStart, 'yyyy-MM-dd');
        dateTo = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      } else {
        dateFrom = format(selectedDate, 'yyyy-MM-dd');
        dateTo = dateFrom;
      }

      dateRangeRef.current = { from: dateFrom, to: dateTo };

      const res = await fetch(
        `/api/admin/specialists/${specialistId}/schedule?date_from=${dateFrom}&date_to=${dateTo}`
      );
      if (!res.ok) throw new Error('Failed to load schedule');
      const json = await res.json();
      setSpecialist(json.specialist);
      setBookings(json.bookings ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [specialistId, selectedDate, viewMode]);

  // Debounced fetch on date/view change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSchedule();
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchSchedule]);

  // Real-time subscription — re-fetch when any booking for this specialist changes
  useEffect(() => {
    if (!specialistId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`specialist-schedule-${specialistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `specialist_id=eq.${specialistId}`,
        },
        () => {
          // Re-fetch on any insert/update/delete for this specialist
          fetchSchedule();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [specialistId, fetchSchedule]);

  return { specialist, bookings, loading, error, refetch: fetchSchedule };
}
