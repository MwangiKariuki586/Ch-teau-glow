'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarPlus, CheckCircle2, Loader2, Clock, Search, X, User, UserCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type ClientResult = {
  source: 'registered' | 'walk_in' | 'guest';
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  user_id?: string;
};

type DropdownItem = { id: string; name: string };
type Slot = { starts_at: string; ends_at: string };

const sourceLabel: Record<ClientResult['source'], string> = {
  registered: 'Registered',
  walk_in: 'Walk-in',
  guest: 'Guest',
};
const sourceBadge: Record<ClientResult['source'], string> = {
  registered: 'bg-emerald-100 text-emerald-700',
  walk_in: 'bg-blue-100 text-blue-700',
  guest: 'bg-gray-100 text-gray-600',
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

export function NewBookingForm() {
  // Client search
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Manual client fields (when not found in system)
  const [manualMode, setManualMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Appointment
  const [branches, setBranches] = useState<DropdownItem[]>([]);
  const [services, setServices] = useState<DropdownItem[]>([]);
  const [specialists, setSpecialists] = useState<DropdownItem[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [branchId, setBranchId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [specialistId, setSpecialistId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches on mount
  useEffect(() => {
    fetch('/api/admin/walk-in/options')
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j) setBranches(j.branches ?? []); })
      .finally(() => setLoadingOptions(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
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
    setSelectedClient(c);
    setGuestName(c.full_name);
    setGuestEmail(c.email ?? '');
    setGuestPhone(c.phone ?? '');
    setManualMode(false);
    setQuery('');
    setShowDropdown(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setManualMode(false);
    setGuestName(''); setGuestEmail(''); setGuestPhone('');
    setQuery('');
  };

  // Cascading dropdowns
  const fetchSlots = useCallback(async (svcId: string, specId: string, date: string) => {
    if (!svcId || !specId || !date) { setSlots([]); return; }
    setLoadingSlots(true);
    setStartsAt('');
    const tz = -new Date().getTimezoneOffset();
    const res = await fetch(`/api/availability?service_id=${svcId}&specialist_id=${specId}&date=${date}&tz_offset_minutes=${tz}`);
    if (res.ok) { const j = await res.json(); setSlots(j.data ?? []); }
    else setSlots([]);
    setLoadingSlots(false);
  }, []);

  const handleBranchChange = useCallback(async (id: string) => {
    setBranchId(id); setServiceId(''); setSpecialistId(''); setStartsAt('');
    setServices([]); setSpecialists([]); setSlots([]);
    if (!id) return;
    setLoadingServices(true);
    const res = await fetch(`/api/admin/walk-in/options?branch_id=${id}`);
    if (res.ok) { const j = await res.json(); setServices(j.services ?? []); }
    setLoadingServices(false);
  }, []);

  const handleServiceChange = useCallback(async (id: string) => {
    setServiceId(id); setSpecialistId(''); setStartsAt('');
    setSpecialists([]); setSlots([]);
    if (!id || !branchId) return;
    setLoadingSpecialists(true);
    const res = await fetch(`/api/admin/walk-in/options?branch_id=${branchId}&service_id=${id}`);
    if (res.ok) { const j = await res.json(); setSpecialists(j.specialists ?? []); }
    setLoadingSpecialists(false);
  }, [branchId]);

  const handleSpecialistChange = useCallback((id: string) => {
    setSpecialistId(id); setStartsAt('');
    fetchSlots(serviceId, id, selectedDate);
  }, [serviceId, selectedDate, fetchSlots]);

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    fetchSlots(serviceId, specialistId, date);
  }, [serviceId, specialistId, fetchSlots]);

  function resetForm() {
    clearClient();
    setBranchId(''); setServiceId(''); setSpecialistId(''); setStartsAt('');
    setServices([]); setSpecialists([]); setSlots([]);
    setSelectedDate(todayISO()); setNotes(''); setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startsAt) { setError('Please select a time slot.'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/admin/new-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedClient?.user_id,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          service_id: serviceId,
          specialist_id: specialistId,
          branch_id: branchId,
          starts_at: startsAt,
          notes,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create booking'); }
      setSuccess(true);
      resetForm();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/40 focus:border-[#C9A96E] shadow-sm transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
  const selectClass = cn(inputClass, 'cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400');
  const clientReady = guestName && guestEmail && guestPhone;

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#3E2723] rounded-lg">
          <CalendarPlus className="w-6 h-6 text-[#C9A96E]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
          <p className="text-sm text-gray-500">Create an appointment for a client</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">Booking created successfully.</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* ── Step 1: Client lookup ── */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Client</h2>

            {!selectedClient && !manualMode ? (
              <div ref={searchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                  <input
                    type="text"
                    placeholder="Search by name, email or phone…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className={cn(inputClass, 'pl-9')}
                    autoComplete="off"
                  />
                </div>

                {/* Search results dropdown */}
                {showDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No clients found.{' '}
                        <button type="button" onClick={() => { setManualMode(true); setGuestName(query); setShowDropdown(false); }}
                          className="text-[#6B4423] font-medium hover:underline">
                          Add as new client
                        </button>
                      </div>
                    ) : (
                      <>
                        {searchResults.map(c => (
                          <button key={`${c.source}-${c.id}`} type="button"
                            onClick={() => selectClient(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F9F3EC] shrink-0">
                              {c.source === 'registered' ? <UserCheck className="w-4 h-4 text-[#6B4423]" /> : <User className="w-4 h-4 text-gray-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{c.full_name}</p>
                              <p className="text-xs text-gray-500 truncate">{c.email ?? c.phone ?? '—'}</p>
                            </div>
                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', sourceBadge[c.source])}>
                              {sourceLabel[c.source]}
                            </span>
                          </button>
                        ))}
                        <div className="px-4 py-2.5 border-t border-gray-100">
                          <button type="button" onClick={() => { setManualMode(true); setShowDropdown(false); }}
                            className="text-xs text-[#6B4423] font-medium hover:underline">
                            + Add as new client instead
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : selectedClient ? (
              /* Selected client card */
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3E2723] shrink-0">
                  <UserCheck className="w-4 h-4 text-[#C9A96E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{selectedClient.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedClient.email ?? selectedClient.phone}</p>
                </div>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sourceBadge[selectedClient.source])}>
                  {sourceLabel[selectedClient.source]}
                </span>
                <button type="button" onClick={clearClient} className="ml-1 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            {/* Manual / new client fields */}
            {(manualMode || selectedClient) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className={labelClass}>Full Name <span className="text-rose-500">*</span></label>
                  <input required type="text" placeholder="Full name" value={guestName}
                    onChange={e => setGuestName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email <span className="text-rose-500">*</span></label>
                  <input required type="email" placeholder="client@example.com" value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone <span className="text-rose-500">*</span></label>
                  <input required type="tel" placeholder="+971 50 000 0000" value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)} className={inputClass} />
                </div>
                {manualMode && (
                  <div className="md:col-span-3 flex items-center gap-2">
                    <button type="button" onClick={clearClient}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Step 2: Appointment details (shown once client is ready) ── */}
          {clientReady && (
            <>
              <div className="border-t border-gray-100" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-4">Appointment Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Branch <span className="text-rose-500">*</span></label>
                    <select required value={branchId} onChange={e => handleBranchChange(e.target.value)}
                      disabled={loadingOptions} className={selectClass}>
                      <option value="">{loadingOptions ? 'Loading…' : 'Select branch…'}</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={cn(labelClass, !branchId && 'text-gray-400')}>Service <span className="text-rose-500">*</span></label>
                    <select required value={serviceId} onChange={e => handleServiceChange(e.target.value)}
                      disabled={!branchId || loadingServices} className={selectClass}>
                      <option value="">{loadingServices ? 'Loading…' : !branchId ? 'Select branch first' : 'Select service…'}</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={cn(labelClass, !serviceId && 'text-gray-400')}>Practitioner <span className="text-rose-500">*</span></label>
                    <select required value={specialistId} onChange={e => handleSpecialistChange(e.target.value)}
                      disabled={!serviceId || loadingSpecialists} className={selectClass}>
                      <option value="">{loadingSpecialists ? 'Loading…' : !serviceId ? 'Select service first' : 'Select practitioner…'}</option>
                      {specialists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              {specialistId && (
                <>
                  <div className="border-t border-gray-100" />
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Date &amp; Time</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Date <span className="text-rose-500">*</span></label>
                        <input type="date" value={selectedDate} min={todayISO()}
                          onChange={e => handleDateChange(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Available Slots <span className="text-rose-500">*</span></label>
                        {loadingSlots ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-2.5">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
                          </div>
                        ) : slots.length === 0 ? (
                          <p className="text-sm text-gray-400 py-2.5">No available slots for this date.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                            {slots.map(slot => {
                              const label = format(parseISO(slot.starts_at), 'h:mm a');
                              const isSelected = startsAt === slot.starts_at;
                              return (
                                <button key={slot.starts_at} type="button"
                                  onClick={() => setStartsAt(slot.starts_at)}
                                  className={cn(
                                    'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                                    isSelected
                                      ? 'border-[#3E2723] bg-[#3E2723] text-white'
                                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#C9A96E] hover:text-[#6B4423]'
                                  )}>
                                  <Clock className="w-3 h-3 shrink-0" />
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-gray-100" />
              <div>
                <label className={labelClass}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={3} placeholder="Any special requests or notes…"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  className={cn(inputClass, 'resize-none')} />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={resetForm}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Clear
            </button>
            <button type="submit" disabled={submitting || !clientReady || !startsAt}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#3E2723] text-white text-sm font-medium hover:bg-[#5D4037] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating…' : 'Create Booking'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
