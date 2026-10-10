'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WalkInFormData, WalkInService, WalkInSpecialist, WalkInBranch } from '../types';

const EMPTY_FORM: WalkInFormData = {
  full_name: '', phone: '', email: '',
  service_id: '', specialist_id: '', branch_id: '',
  starts_at: '', notes: '',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function WalkInRegistrationForm() {
  const [form, setForm] = useState<WalkInFormData>(EMPTY_FORM);
  const [branches, setBranches] = useState<WalkInBranch[]>([]);
  const [services, setServices] = useState<WalkInService[]>([]);
  const [specialists, setSpecialists] = useState<WalkInSpecialist[]>([]);
  const [slots, setSlots] = useState<{ starts_at: string; ends_at: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches on mount
  useEffect(() => {
    fetch('/api/admin/walk-in/options')
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j) setBranches(j.branches ?? []); })
      .finally(() => setLoadingOptions(false));
  }, []);

  // Fetch slots when specialist + date are set
  const fetchSlots = useCallback(async (serviceId: string, specialistId: string, date: string) => {
    if (!serviceId || !specialistId || !date) { setSlots([]); return; }
    setLoadingSlots(true);
    setForm(prev => ({ ...prev, starts_at: '' }));
    const tzOffset = -new Date().getTimezoneOffset();
    const res = await fetch(
      `/api/availability?service_id=${serviceId}&specialist_id=${specialistId}&date=${date}&tz_offset_minutes=${tzOffset}`
    );
    if (res.ok) {
      const j = await res.json();
      setSlots(j.data ?? []);
    } else {
      setSlots([]);
    }
    setLoadingSlots(false);
  }, []);

  const handleBranchChange = useCallback(async (branchId: string) => {
    setForm(prev => ({ ...prev, branch_id: branchId, service_id: '', specialist_id: '', starts_at: '' }));
    setServices([]); setSpecialists([]); setSlots([]);
    if (!branchId) return;
    setLoadingServices(true);
    const res = await fetch(`/api/admin/walk-in/options?branch_id=${branchId}`);
    if (res.ok) { const j = await res.json(); setServices(j.services ?? []); }
    setLoadingServices(false);
  }, []);

  const handleServiceChange = useCallback(async (serviceId: string) => {
    setForm(prev => ({ ...prev, service_id: serviceId, specialist_id: '', starts_at: '' }));
    setSpecialists([]); setSlots([]);
    if (!serviceId || !form.branch_id) return;
    setLoadingSpecialists(true);
    const res = await fetch(`/api/admin/walk-in/options?branch_id=${form.branch_id}&service_id=${serviceId}`);
    if (res.ok) { const j = await res.json(); setSpecialists(j.specialists ?? []); }
    setLoadingSpecialists(false);
  }, [form.branch_id]);

  const handleSpecialistChange = useCallback((specialistId: string) => {
    setForm(prev => ({ ...prev, specialist_id: specialistId, starts_at: '' }));
    fetchSlots(form.service_id, specialistId, selectedDate);
  }, [form.service_id, selectedDate, fetchSlots]);

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    fetchSlots(form.service_id, form.specialist_id, date);
  }, [form.service_id, form.specialist_id, fetchSlots]);

  const set = (field: keyof WalkInFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register walk-in client');
      }
      setSuccess(true);
      setForm(EMPTY_FORM);
      setServices([]); setSpecialists([]); setSlots([]);
      setSelectedDate(todayISO());
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/40 focus:border-[#C9A96E] shadow-sm transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
  const selectClass = cn(inputClass, 'cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400');

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#3E2723] rounded-lg">
          <Users className="w-6 h-6 text-[#C9A96E]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Walk-in Registration</h1>
          <p className="text-sm text-gray-500">Register a client who has arrived at the facility</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">Walk-in client registered successfully.</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-800 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Client info */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Client Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name <span className="text-rose-500">*</span></label>
                <input required type="text" placeholder="e.g. Sarah Al Mansoori"
                  value={form.full_name} onChange={set('full_name')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone Number <span className="text-rose-500">*</span></label>
                <input required type="tel" placeholder="+971 50 000 0000"
                  value={form.phone} onChange={set('phone')} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Email Address <span className="text-rose-500">*</span></label>
                <input required type="email" placeholder="client@example.com"
                  value={form.email} onChange={set('email')} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Appointment details */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Appointment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Branch <span className="text-rose-500">*</span></label>
                <select required value={form.branch_id}
                  onChange={e => handleBranchChange(e.target.value)}
                  disabled={loadingOptions} className={selectClass}>
                  <option value="">{loadingOptions ? 'Loading…' : 'Select branch…'}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className={cn(labelClass, !form.branch_id && 'text-gray-400')}>
                  Service <span className="text-rose-500">*</span>
                </label>
                <select required value={form.service_id}
                  onChange={e => handleServiceChange(e.target.value)}
                  disabled={!form.branch_id || loadingServices} className={selectClass}>
                  <option value="">{loadingServices ? 'Loading…' : !form.branch_id ? 'Select branch first' : 'Select service…'}</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={cn(labelClass, !form.service_id && 'text-gray-400')}>
                  Practitioner <span className="text-rose-500">*</span>
                </label>
                <select required value={form.specialist_id}
                  onChange={e => handleSpecialistChange(e.target.value)}
                  disabled={!form.service_id || loadingSpecialists} className={selectClass}>
                  <option value="">{loadingSpecialists ? 'Loading…' : !form.service_id ? 'Select service first' : 'Select practitioner…'}</option>
                  {specialists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time — shown once practitioner is selected */}
          {form.specialist_id && (
            <>
              <div className="border-t border-gray-100" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-4">Date &amp; Time</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date picker */}
                  <div>
                    <label className={labelClass}>Date <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={todayISO()}
                      onChange={e => handleDateChange(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* Time slots */}
                  <div>
                    <label className={labelClass}>
                      Available Slots <span className="text-rose-500">*</span>
                    </label>
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
                          const isSelected = form.starts_at === slot.starts_at;
                          return (
                            <button
                              key={slot.starts_at}
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, starts_at: slot.starts_at }))}
                              className={cn(
                                'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                                isSelected
                                  ? 'border-[#3E2723] bg-[#3E2723] text-white'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-[#C9A96E] hover:text-[#6B4423]'
                              )}
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Hidden required input to enforce slot selection */}
                    <input
                      type="text"
                      required
                      value={form.starts_at}
                      onChange={() => {}}
                      className="sr-only"
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-gray-100" />

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea rows={3} placeholder="Any special requests, allergies, or notes…"
              value={form.notes} onChange={set('notes')} className={cn(inputClass, 'resize-none')} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setForm(EMPTY_FORM); setServices([]); setSpecialists([]); setSlots([]); setSelectedDate(todayISO()); setError(null); }}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#3E2723] text-white text-sm font-medium hover:bg-[#5D4037] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Registering…' : 'Register Walk-in'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
