'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, addMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar, Clock, User, Scissors, ExternalLink, XCircle,
  AlertTriangle, CheckCircle2, CalendarClock, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatSlotTime } from '../utils/schedule-slots';
import type { ScheduleBooking } from '../hooks/use-specialist-schedule';

const STATUS_STYLES: Record<string, string> = {
  confirmed:   'bg-emerald-100 text-emerald-700',
  pending:     'bg-amber-100 text-amber-700',
  rescheduled: 'bg-blue-100 text-blue-700',
  completed:   'bg-gray-100 text-gray-600',
  rejected:    'bg-rose-100 text-rose-700',
  cancelled:   'bg-rose-100 text-rose-700',
};

const APPROVABLE  = new Set(['pending', 'rescheduled']);
const CANCELLABLE = new Set(['pending', 'confirmed', 'rescheduled']);
const RESCHEDULABLE = new Set(['pending', 'confirmed', 'rescheduled']);

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

interface AvailabilitySlot {
  day: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

interface TimelineSlot {
  time: string;
  label: string;
  isoStart: string;
  isBooked: boolean;
  bookedBy?: string;
}

function buildTimeline(
  dateStr: string,
  availability: AvailabilitySlot[] | null,
  bookings: Array<{ id: string; starts_at: string; ends_at: string; customer_name: string }>,
  excludeBookingId: string,
): TimelineSlot[] {
  const dayIndex = new Date(dateStr + 'T12:00:00').getDay();
  const dayName = DAY_NAMES[dayIndex];
  const avail = (availability ?? []).find(a => a.day === dayName);
  if (!avail?.is_available) return [];

  const slots: TimelineSlot[] = [];
  let cursor = new Date(`${dateStr}T${avail.start_time}:00`);
  const end   = new Date(`${dateStr}T${avail.end_time}:00`);

  while (cursor < end) {
    const slotEnd = addMinutes(cursor, 30);
    const conflict = bookings.find(b => {
      if (b.id === excludeBookingId) return false;
      const bs = parseISO(b.starts_at);
      const be = parseISO(b.ends_at);
      return bs < slotEnd && be > cursor;
    });
    slots.push({
      time: format(cursor, 'HH:mm'),
      label: format(cursor, 'h:mm a'),
      isoStart: cursor.toISOString(),
      isBooked: !!conflict,
      bookedBy: conflict?.customer_name,
    });
    cursor = addMinutes(cursor, 30);
  }
  return slots;
}

type PanelMode = 'detail' | 'approve' | 'reschedule' | 'cancel';

interface Props {
  booking: ScheduleBooking | null;
  open: boolean;
  onClose: () => void;
  onActionDone?: () => void;
  specialistId?: string;
}

export function ScheduleBookingDialog({ booking, open, onClose, onActionDone, specialistId }: Props) {
  const [mode, setMode] = useState<PanelMode>('detail');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartsAt, setRescheduleStartsAt] = useState('');
  const [availability, setAvailability] = useState<AvailabilitySlot[] | null>(null);
  const [dayBookings, setDayBookings] = useState<Array<{ id: string; starts_at: string; ends_at: string; customer_name: string }>>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    if (!open) { setMode('detail'); setReason(''); setError(null); setRescheduleDate(''); setRescheduleStartsAt(''); }
  }, [open]);

  const fetchSchedule = useCallback(async (d: string) => {
    if (!specialistId) return;
    setLoadingSchedule(true);
    setRescheduleStartsAt('');
    try {
      const res = await fetch(`/api/admin/specialists/${specialistId}/schedule?date_from=${d}&date_to=${d}`);
      if (!res.ok) return;
      const j = await res.json();
      setAvailability(j.specialist?.availability ?? null);
      setDayBookings(j.bookings ?? []);
    } finally {
      setLoadingSchedule(false);
    }
  }, [specialistId]);

  useEffect(() => {
    if (mode === 'reschedule' && rescheduleDate) fetchSchedule(rescheduleDate);
  }, [mode, rescheduleDate, fetchSchedule]);

  if (!booking) return null;

  const canApprove    = APPROVABLE.has(booking.status);
  const canCancel     = CANCELLABLE.has(booking.status);
  const canReschedule = RESCHEDULABLE.has(booking.status);

  function handleClose() { onClose(); }

  async function handleApprove() {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to approve'); }
      onActionDone?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!reason.trim()) { setError('Please provide a reason.'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: reason.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to cancel'); }
      onActionDone?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReschedule() {
    if (!rescheduleStartsAt) { setError('Please select a time slot.'); return; }
    if (!reason.trim()) { setError('Please provide a reason.'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reschedule', starts_at: rescheduleStartsAt, reason: reason.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to reschedule'); }
      onActionDone?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  const timeline = rescheduleDate
    ? buildTimeline(rescheduleDate, availability, dayBookings, booking.id)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            Booking Details
          </DialogTitle>
        </DialogHeader>

        {/* ── Detail view ── */}
        {mode === 'detail' && (
          <>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-600'}>
                  {booking.status}
                </Badge>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{booking.customer_name}</p>
                  {booking.customer_email && <p className="text-muted-foreground text-xs">{booking.customer_email}</p>}
                  {booking.customer_phone && <p className="text-muted-foreground text-xs">{booking.customer_phone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{booking.service_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  {formatSlotTime(booking.starts_at)} – {formatSlotTime(booking.ends_at)}
                  <span className="text-muted-foreground ml-1">({booking.duration_minutes} min)</span>
                </span>
              </div>
              {booking.branch_name && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{booking.branch_name}</span>
                </div>
              )}
              {(booking.payment_status || booking.booking_channel) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
                  {booking.payment_status && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-foreground">Payment:</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        booking.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      )}>{booking.payment_status}</span>
                    </span>
                  )}
                  {booking.booking_channel && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-foreground">Via:</span> {booking.booking_channel}
                    </span>
                  )}
                </div>
              )}
              {booking.created_at && (
                <p className="text-[10px] text-muted-foreground/60">
                  Booked {format(new Date(booking.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}
              {booking.notes && (
                <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">{booking.notes}</div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {canApprove && (
                <Button className="w-full" onClick={() => setMode('approve')}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve Booking
                </Button>
              )}
              {canReschedule && (
                <Button variant="outline" className="w-full" onClick={() => {
                  setRescheduleDate(format(parseISO(booking.starts_at), 'yyyy-MM-dd'));
                  setMode('reschedule');
                }}>
                  <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Reschedule
                </Button>
              )}
              <div className="flex gap-2">
                {canCancel && (
                  <Button variant="outline"
                    className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setMode('cancel')}>
                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel
                  </Button>
                )}
                <Button className={cn('flex-1', !canCancel && 'w-full')} variant="outline" asChild>
                  <Link href={`/admin/bookings/${booking.id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Approve confirmation ── */}
        {mode === 'approve' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Approve <strong>{booking.customer_name}</strong>'s booking for <strong>{booking.service_name}</strong>?</p>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setMode('detail'); setError(null); }}>Back</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {submitting ? 'Approving…' : 'Confirm Approve'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Reschedule ── */}
        {mode === 'reschedule' && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>New date *</label>
              <input type="date" value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className={inputCls} />
            </div>

            {rescheduleDate && (
              <div>
                <label className={labelCls}>
                  Available slots — {format(new Date(rescheduleDate + 'T12:00:00'), 'EEE, MMM d')}
                </label>
                {loadingSchedule ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No working hours for this day.</p>
                ) : (
                  <div className="rounded-lg border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
                    {timeline.map(slot => {
                      const isSelected = rescheduleStartsAt === slot.isoStart;
                      return (
                        <button key={slot.time} type="button" disabled={slot.isBooked}
                          onClick={() => !slot.isBooked && setRescheduleStartsAt(slot.isoStart)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-left text-sm border-b border-gray-100 last:border-0 transition-colors',
                            slot.isBooked && 'bg-rose-50 cursor-not-allowed',
                            !slot.isBooked && !isSelected && 'hover:bg-emerald-50 cursor-pointer',
                            isSelected && 'bg-primary/10 ring-1 ring-inset ring-primary',
                          )}>
                          <span className="w-16 shrink-0 text-xs font-mono text-muted-foreground">{slot.label}</span>
                          <span className={cn('w-2 h-2 rounded-full shrink-0', slot.isBooked ? 'bg-rose-400' : 'bg-emerald-500')} />
                          {slot.isBooked ? (
                            <span className="text-xs text-rose-600 truncate">{slot.bookedBy}</span>
                          ) : (
                            <span className={cn('text-xs', isSelected ? 'text-primary font-medium' : 'text-emerald-600')}>
                              {isSelected ? '✓ Selected' : 'Available'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={labelCls}>Reason *</label>
              <textarea rows={2} value={reason} onChange={e => { setReason(e.target.value); setError(null); }}
                placeholder="e.g. Specialist unavailable at original time…"
                className={cn(inputCls, 'resize-none')} />
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setMode('detail'); setError(null); setReason(''); }}>Back</Button>
              <Button className="flex-1" onClick={handleReschedule} disabled={submitting || !rescheduleStartsAt || !reason.trim()}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {submitting ? 'Saving…' : 'Confirm Reschedule'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Cancel ── */}
        {mode === 'cancel' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Cancel <strong>{booking.customer_name}</strong>'s booking for <strong>{booking.service_name}</strong>?</p>
            </div>
            <div>
              <label className={labelCls}>Reason *</label>
              <textarea rows={3} value={reason} onChange={e => { setReason(e.target.value); setError(null); }}
                placeholder="e.g. Booked by mistake, double booking…"
                className={cn(inputCls, 'resize-none')} />
              {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setMode('detail'); setReason(''); setError(null); }}>Back</Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={submitting}>
                {submitting ? 'Cancelling…' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
