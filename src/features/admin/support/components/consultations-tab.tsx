'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  CalendarClock, CheckCircle2, Clock, Download, Filter,
  Search, Sparkles, User, X, XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { subscribeToTable, unsubscribe } from '@/lib/supabase/realtime';
import { cn } from '@/lib/utils';
import { updateConsultationStatus } from '../api/consultations';
import type { Consultation, ConsultationFilters, ConsultationStatus } from '../types';

// ── Badge config ──────────────────────────────────────────────────────────────

const statusConfig: Record<ConsultationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function exportCSV(rows: Consultation[]) {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Service', 'Date', 'Time', 'Status', 'Submitted'];
  const data = rows.map((c) => [
    c.first_name,
    c.last_name,
    c.email,
    c.phone_number,
    c.service_type,
    c.preferred_date,
    c.preferred_time,
    c.status,
    format(new Date(c.created_at), 'yyyy-MM-dd HH:mm'),
  ]);
  const csv = [headers, ...data].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `consultations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, colorClass,
}: { title: string; value: number; icon: React.ElementType; colorClass: string }) {
  const bgClass = colorClass
    .replace('text-', 'bg-')
    .replace('-600', '-100')
    .replace('-400', '-900/20');
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`mt-1 text-3xl font-bold ${colorClass}`}>{value}</p>
        </div>
        <div className={`rounded-full p-3 ${bgClass}`}>
          <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Filter sidebar ────────────────────────────────────────────────────────────

const EMPTY_FILTERS: ConsultationFilters = {
  status: 'all',
  serviceType: 'all',
  dateFrom: '',
  dateTo: '',
};

// ── Inline Filter Panel ───────────────────────────────────────────────────────

function ConsultationFilterPanel({
  filters, onFiltersChange, serviceTypes,
}: {
  filters: ConsultationFilters;
  onFiltersChange: (f: ConsultationFilters) => void;
  serviceTypes: string[];
}) {
  const reset = () => onFiltersChange(EMPTY_FILTERS);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Filter Consultations</span>
        <button onClick={reset} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium">
          <X className="w-3 h-3" /> Clear all
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={e => onFiltersChange({ ...filters, status: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Service Type</label>
          <select
            value={filters.serviceType}
            onChange={e => onFiltersChange({ ...filters, serviceType: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          >
            <option value="all">All Services</option>
            {serviceTypes.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          />
        </div>
      </div>
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────

function ConsultationDetailDrawer({
  consultation, onClose, onUpdated,
}: {
  consultation: Consultation | null;
  onClose: () => void;
  onUpdated: (c: Consultation) => void;
}) {
  const [status, setStatus] = useState<ConsultationStatus>('pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (consultation) setStatus(consultation.status);
  }, [consultation]);

  if (!consultation) return null;

  const save = async () => {
    if (status === consultation.status) { onClose(); return; }
    setSaving(true);
    try {
      await updateConsultationStatus(consultation.id, status);
      onUpdated({ ...consultation, status });
      onClose();
    } catch (err) {
      console.error('Error updating consultation status:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!consultation} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Consultation Request</SheetTitle>
        </SheetHeader>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#6B4423] to-[#4A2C1A] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <CalendarClock className="h-4 w-4 text-[#C9A96E]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/60">Consultation</p>
                <h2 className="text-base font-bold text-white">
                  {consultation.first_name} {consultation.last_name}
                </h2>
              </div>
            </div>
            <Badge className={statusConfig[consultation.status].className}>
              {statusConfig[consultation.status].label}
            </Badge>
          </div>
        </div>

        <div className="space-y-5 p-6">

          {/* Contact card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Contact</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-gray-400 text-sm">✉</span>
                <span className="text-sm text-gray-700">{consultation.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-gray-400 text-sm">📞</span>
                <span className="text-sm text-gray-700">{consultation.phone_number}</span>
              </div>
            </div>
          </div>

          {/* Booking details card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Booking Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Service</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{consultation.service_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Preferred Date</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {format(new Date(consultation.preferred_date + 'T00:00:00'), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Preferred Time</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{consultation.preferred_time}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Submitted</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {format(new Date(consultation.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Concerns */}
          {consultation.concerns_or_goals && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Concerns / Goals</p>
              <p className="text-sm leading-relaxed text-gray-600 rounded-lg bg-gray-50 p-3 border border-gray-100">
                {consultation.concerns_or_goals}
              </p>
            </div>
          )}

          {/* Status update */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Update Status</p>
            <Select value={status} onValueChange={(v) => setStatus(v as ConsultationStatus)}>
              <SelectTrigger className="border-gray-200 focus:border-[#C9A96E] focus:ring-[#C9A96E]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="mt-3 w-full rounded-lg bg-[#6B4423] hover:bg-[#4A2C1A]"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function ConsultationsTab({
  initialConsultations,
}: {
  initialConsultations: Consultation[];
}) {
  const [consultations, setConsultations] = useState<Consultation[]>(initialConsultations);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ConsultationFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Consultation | null>(null);

  // Real-time: reflect new submissions and status changes instantly
  useEffect(() => {
    const channel = subscribeToTable<Consultation>('consultations', ({ eventType, new: next, old }) => {
      setConsultations((prev) => {
        if (eventType === 'INSERT') return [next, ...prev];
        if (eventType === 'UPDATE') return prev.map((c) => (c.id === next.id ? next : c));
        if (eventType === 'DELETE') return prev.filter((c) => c.id !== (old as Consultation).id);
        return prev;
      });
    });
    return () => { unsubscribe(channel); };
  }, []);

  const handleUpdated = (updated: Consultation) => {
    setConsultations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(null);
  };

  // Unique service types for the filter dropdown
  const serviceTypes = [...new Set(consultations.map((c) => c.service_type))].sort();

  // Filter + search
  const visible = consultations.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      [c.first_name, c.last_name, c.email, c.service_type]
        .some((f) => f?.toLowerCase().includes(q));
    const matchStatus = filters.status === 'all' || c.status === filters.status;
    const matchService = filters.serviceType === 'all' || c.service_type === filters.serviceType;
    const matchDateFrom = !filters.dateFrom || c.preferred_date >= filters.dateFrom;
    const matchDateTo = !filters.dateTo || c.preferred_date <= filters.dateTo;
    return matchSearch && matchStatus && matchService && matchDateFrom && matchDateTo;
  });

  // Stats
  const total = consultations.length;
  const pending = consultations.filter((c) => c.status === 'pending').length;
  const confirmed = consultations.filter((c) => c.status === 'confirmed').length;
  const completed = consultations.filter((c) => c.status === 'completed').length;

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.serviceType !== 'all' ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total" value={total} icon={Sparkles} colorClass="text-primary" />
        <StatCard title="Pending" value={pending} icon={Clock} colorClass="text-amber-600 dark:text-amber-400" />
        <StatCard title="Confirmed" value={confirmed} icon={CalendarClock} colorClass="text-blue-600 dark:text-blue-400" />
        <StatCard title="Completed" value={completed} icon={CheckCircle2} colorClass="text-green-600 dark:text-green-400" />
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or service…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm shrink-0',
              filterOpen || hasActiveFilters
                ? 'bg-[#6B4423] text-white border-[#6B4423]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            )}
          >
            <Filter className="w-4 h-4" />
            Filter
            {hasActiveFilters && (
              <span className="bg-white text-[#6B4423] text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {[filters.status !== 'all', filters.serviceType !== 'all', !!filters.dateFrom, !!filters.dateTo].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button
            variant="outline"
            onClick={() => exportCSV(visible)}
            disabled={visible.length === 0}
            className="shrink-0"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {filterOpen && (
          <ConsultationFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            serviceTypes={serviceTypes}
          />
        )}
      </div>
      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Preferred Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <CalendarClock className="h-12 w-12 text-muted-foreground/40" />
                      <p className="text-lg font-medium">No consultations found</p>
                      <p className="text-sm text-muted-foreground">
                        Consultation bookings will appear here once submitted.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell>
                      <div className="font-medium">{c.first_name} {c.last_name}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{c.service_type}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(c.preferred_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.preferred_time}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[c.status].className}>
                        {statusConfig[c.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(c.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {visible.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            Showing {visible.length} of {total} consultations
          </div>
        )}
      </Card>

      {/* Detail drawer */}
      <ConsultationDetailDrawer
        consultation={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
