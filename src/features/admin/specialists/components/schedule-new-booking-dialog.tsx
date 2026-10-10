'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format, parseISO, addMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarPlus, CheckCircle2, Loader2, Search, X, User, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type ClientResult = {
  source: 'registered' | 'walk_in' | 'guest';
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  user_id?: string;
};

type ServiceItem = { id: string; name: string };

interface BookingSlot {
  id: string;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  service_name: string;
  status: string;
}

interface AvailabilitySlot {
  day: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

interface TimelineSlot {
  time: string;       // "09:00"
  label: string;      // "9:00 AM"
  isoStart: string;   // full ISO for submission
  booking: BookingSlot | null;
  isWorking: boolean;
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const sourceBadge: Record<ClientResult['source'], string> = {
  registered: 'bg-emerald-100 text-emerald-700',
  walk_in: 'bg-blue-100 text-blue-700',
  guest: 'bg-gray-100 text-gray-600',
};
const sourceLabel: Record<ClientResult['source'], string> = {
  registered: 'Registered', walk_in: 'Walk-in', guest: 'Guest',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  specialistId: string;
  specialistName: string;
  branchId: string;
  date: Date;
  startsAt: string;
}

function buildTimeline(
  dateStr: string,
  availability: AvailabilitySlot[] | null,
  bookings: BookingSlot[]
): TimelineSlot[] {
  const dayIndex = new Date(dateStr + 'T12:00:00').getDay();
  const dayName = DAY_NAMES[dayIndex];
  const avail = (availability ?? []).find(a => a.day === dayName);
  const isWorking = avail?.is_available ?? false;
  const startHHMM = isWorking ? avail!.start_time : '08:00';
  const endHHMM   = isWorking ? avail!.end_time   : '20:00';

  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);

  const slots: TimelineSlot[] = [];
  let cursor = new Date(`${dateStr}T${startHHMM}:00`);
  const end   = new Date(`${dateStr}T${endHHMM}:00`);

  while (cursor < end) {
    const hhmm = format(cursor, 'HH:mm');
    const label = format(cursor, 'h:mm a');
    const slotEnd = addMinutes(cursor, 30);
    const booking = bookings.find(b => {
      const bs = parseISO(b.starts_at);
      const be = parseISO(b.ends_at);
      return bs < slotEnd && be > cursor;
    }) ?? null;
    slots.push({ time: hhmm, label, isoStart: cursor.toISOString(), booking, isWorking });
    cursor = addMinutes(cursor, 30);
  }
  return slots;
}

export function ScheduleNewBookingDialog({
  open, onClose, onSuccess,
  specialistId, specialistName, branchId, date, startsAt,
}: Props) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState(format(date, 'yyyy-MM-dd'));
  const [selectedStartsAt, setSelectedStartsAt] = useState('');
  const [notes, setNotes] = useState('');

  // Schedule data from the working schedule API
  const [availability, setAvailability] = useState<AvailabilitySlot[] | null>(null);
  const [dayBookings, setDayBookings] = useState<BookingSlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (!open || !branchId) return;
    setQuery(''); setSelectedClient(null); setManualMode(false);
    setGuestName(''); setGuestEmail(''); setGuestPhone('');
    setServiceId(''); setSelectedStartsAt('');
    setBookingDate(format(date, 'yyyy-MM-dd'));
    setNotes(''); setError(null); setSuccess(false);
    setDayBookings([]); setAvailability(null);

    setLoadingServices(true);
    fetch(`/api/admin/walk-in/options?branch_id=${branchId}&specialist_id=${specialistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j) setServices(j.services ?? []); })
      .finally(() => setLoadingServices(false));
  }, [open, branchId, specialistId, date, startsAt]);

  // Fetch schedule whenever date changes
  const fetchSchedule = useCallback(async (d: string) => {
    setLoadingSchedule(true);
    setSelectedStartsAt('');
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
    if (open && bookingDate) fetchSchedule(bookingDate);
  }, [open, bookingDate, fetchSchedule]);

  // Outside click for dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced client search
  useEffect(() => {
    if (query.length < 2) { setSearchResults([]); setShowDropdown(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/admin/client-search?q=${encodeURIComponent(query)}`);
      if (res.ok) { const j = await res.json(); setSearchResults(j.results ?? []); setShowDropdown(true); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const selectClient = (c: ClientResult) => {
    setSelectedClient(c); setGuestName(c.full_name);
    setGuestEmail(c.email ?? ''); setGuestPhone(c.phone ?? '');
    setManualMode(false); setQuery(''); setShowDropdown(false);
  };
  const clearClient = () => {
    setSelectedClient(null); setManualMode(false);
    setGuestName(''); setGuestEmail(''); setGuestPhone(''); setQuery('');
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) { setError('Please select a service.'); return; }
    if (!selectedStartsAt) { setError('Please select an available time slot.'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/admin/new-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedClient?.user_id,
          guest_name: guestName, guest_email: guestEmail, guest_phone: guestPhone,
          service_id: serviceId, specialist_id: specialistId,
          branch_id: branchId, starts_at: selectedStartsAt, notes,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create booking'); }
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const timeline = buildTimeline(bookingDate, availability, dayBookings);
  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const clientReady = guestName && guestEmail && guestPhone;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            New Booking — {specialistName}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-medium">Booking created successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

            {/* Client */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Client</p>
              {!selectedClient && !manualMode ? (
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                    <input type="text" placeholder="Search by name, email or phone…"
                      value={query} onChange={e => setQuery(e.target.value)}
                      className={cn(inputCls, 'pl-9')} autoComplete="off" />
                  </div>
                  {showDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                      {searchResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No clients found.{' '}
                          <button type="button" onClick={() => { setManualMode(true); setGuestName(query); setShowDropdown(false); }}
                            className="text-primary font-medium hover:underline">Add as new</button>
                        </div>
                      ) : (
                        <>
                          {searchResults.map(c => (
                            <button key={`${c.source}-${c.id}`} type="button" onClick={() => selectClient(c)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
                                {c.source === 'registered' ? <UserCheck className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-gray-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{c.email ?? c.phone ?? '—'}</p>
                              </div>
                              <span className={cn('text-xs px-2 py-0.5 rounded-full', sourceBadge[c.source])}>{sourceLabel[c.source]}</span>
                            </button>
                          ))}
                          <div className="px-4 py-2 border-t border-gray-100">
                            <button type="button" onClick={() => { setManualMode(true); setShowDropdown(false); }}
                              className="text-xs text-primary hover:underline">+ Add as new client</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : selectedClient ? (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <UserCheck className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedClient.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
                  </div>
                  <button type="button" onClick={clearClient}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
              ) : null}

              {(manualMode || selectedClient) && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div><label className={labelCls}>Name *</label>
                    <input required type="text" value={guestName} onChange={e => setGuestName(e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Email *</label>
                    <input required type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Phone *</label>
                    <input required type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className={inputCls} /></div>
                </div>
              )}
            </div>

            {/* Appointment */}
            {clientReady && (
              <div className="space-y-4">
                <div className="border-t border-border" />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Date *</label>
                    <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Service *</label>
                    <select required value={serviceId} onChange={e => setServiceId(e.target.value)}
                      disabled={loadingServices} className={cn(inputCls, 'cursor-pointer disabled:opacity-50')}>
                      <option value="">{loadingServices ? 'Loading…' : 'Select service…'}</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Timeline — always shown once client + service ready */}
                {serviceId && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls}>Schedule for {format(new Date(bookingDate + 'T12:00:00'), 'EEE, MMM d')}</label>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Available</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Booked</span>
                      </div>
                    </div>

                    {loadingSchedule ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading schedule…
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 overflow-hidden max-h-56 overflow-y-auto">
                        {timeline.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-3">No working hours for this day.</p>
                        ) : (
                          timeline.map(slot => {
                            const isBooked = !!slot.booking;
                            const isSelected = selectedStartsAt === slot.isoStart;
                            return (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={isBooked}
                                onClick={() => !isBooked && setSelectedStartsAt(slot.isoStart)}
                                className={cn(
                                  'w-full flex items-center gap-3 px-3 py-2 text-left text-sm border-b border-gray-100 last:border-0 transition-colors',
                                  isBooked && 'bg-rose-50 cursor-not-allowed',
                                  !isBooked && !isSelected && 'hover:bg-emerald-50 cursor-pointer',
                                  isSelected && 'bg-primary/10 ring-1 ring-inset ring-primary',
                                )}
                              >
                                <span className="w-16 shrink-0 text-xs font-mono text-muted-foreground">{slot.label}</span>
                                <span className={cn('w-2 h-2 rounded-full shrink-0', isBooked ? 'bg-rose-400' : 'bg-emerald-500')} />
                                {isBooked ? (
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-rose-700 truncate block">{slot.booking!.customer_name}</span>
                                    <span className="text-xs text-rose-500 truncate block">{slot.booking!.service_name}</span>
                                  </div>
                                ) : (
                                  <span className={cn('text-xs', isSelected ? 'text-primary font-medium' : 'text-emerald-600')}>
                                    {isSelected ? '✓ Selected' : 'Available'}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className={labelCls}>Notes (optional)</label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    className={cn(inputCls, 'resize-none')} placeholder="Any special requests…" />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !clientReady || !selectedStartsAt || !serviceId}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Creating…' : 'Create Booking'}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
