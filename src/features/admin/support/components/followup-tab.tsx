'use client';

import { useCallback, useEffect, useState } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import {
  AlertTriangle, Calendar, CheckCircle2, ChevronDown,
  Clock, Filter, Mail, Phone, Search, Send, StickyNote, User, X,
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { subscribeToTable, unsubscribe } from '@/lib/supabase/realtime';

import {
  updateFollowUpNotes,
  updateFollowUpStatus,
  triggerFollowUpEmails,
} from '../api/followup';
import type { AdminUser, FollowUpBooking, FollowUpFilters, FollowUpStatus } from '../types';

// ── Status config ────────────────────────────────────────────────────────────

const followUpStatusConfig: Record<FollowUpStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  contacted: { label: 'Contacted', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = parseISO(dueDate);
  return isPast(d) && !isToday(d);
}

function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return isToday(parseISO(dueDate));
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, colorClass,
}: { title: string; value: number; icon: React.ElementType; colorClass: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
        </div>
        <div className={`rounded-full p-3 bg-current/10`} style={{ background: 'currentColor', opacity: 0.1 }}>
          <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Inline Filter Panel ───────────────────────────────────────────────────────

function FollowUpFilterPanel({
  filters, onFiltersChange, admins,
}: {
  filters: FollowUpFilters;
  onFiltersChange: (f: FollowUpFilters) => void;
  admins: AdminUser[];
}) {
  const reset = () => onFiltersChange({ status: 'all', assignedTo: 'all', dueDateFrom: '', dueDateTo: '', overdueOnly: false });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Filter Follow-Ups</span>
        <button onClick={reset} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium">
          <X className="w-3 h-3" /> Clear all
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={e => onFiltersChange({ ...filters, status: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Assigned To</label>
          <select
            value={filters.assignedTo}
            onChange={e => onFiltersChange({ ...filters, assignedTo: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          >
            <option value="all">All Admins</option>
            <option value="unassigned">Unassigned</option>
            {admins.map(a => (
              <option key={a.user_id} value={a.user_id}>{a.first_name} {a.last_name || a.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Due Date From</label>
          <input
            type="date"
            value={filters.dueDateFrom}
            onChange={e => onFiltersChange({ ...filters, dueDateFrom: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Due Date To</label>
          <input
            type="date"
            value={filters.dueDateTo}
            onChange={e => onFiltersChange({ ...filters, dueDateTo: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.overdueOnly}
              onChange={e => onFiltersChange({ ...filters, overdueOnly: e.target.checked })}
              className="h-4 w-4 rounded accent-rose-600"
            />
            <span className="text-sm font-medium text-rose-600">Overdue only</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function FollowUpDetailPanel({
  booking, onClose, onUpdated,
}: {
  booking: FollowUpBooking | null;
  onClose: () => void;
  onUpdated: (b: FollowUpBooking) => void;
}) {
  const [notes, setNotes] = useState(booking?.follow_up_notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => { setNotes(booking?.follow_up_notes ?? ''); }, [booking]);

  if (!booking) return null;

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateFollowUpNotes(booking.id, notes);
      onUpdated({ ...booking, follow_up_notes: notes });
    } catch (err) {
      console.error('Error saving notes', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const overdue = isOverdue(booking.follow_up_due_date);

  return (
    <Sheet open={!!booking} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Follow-Up Details</SheetTitle>
        </SheetHeader>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#6B4423] to-[#4A2C1A] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Calendar className="h-4 w-4 text-[#C9A96E]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/60">Follow-Up</p>
                <h2 className="text-base font-bold text-white">
                  {booking.customer_name ?? 'Unknown Customer'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={followUpStatusConfig[booking.follow_up_status ?? 'pending']?.className}>
                {followUpStatusConfig[booking.follow_up_status ?? 'pending']?.label}
              </Badge>
              {overdue && (
                <Badge className="bg-red-500/20 text-red-200 border-red-400/30 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Overdue
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">

          {/* Customer card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Customer</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6B4423]/10">
                  <User className="h-4 w-4 text-[#6B4423]" />
                </div>
                <span className="font-semibold text-gray-900">{booking.customer_name ?? '—'}</span>
              </div>
              {booking.customer_email && (
                <div className="flex items-center gap-2.5 pl-0.5">
                  <Mail className="h-4 w-4 text-gray-400 ml-2" />
                  <span className="text-sm text-gray-600">{booking.customer_email}</span>
                </div>
              )}
              {booking.customer_phone && (
                <div className="flex items-center gap-2.5 pl-0.5">
                  <Phone className="h-4 w-4 text-gray-400 ml-2" />
                  <span className="text-sm text-gray-600">{booking.customer_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Booking card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Booking</p>
            <div className="grid grid-cols-2 gap-3">
              {booking.service_name && (
                <div>
                  <p className="text-xs text-gray-400">Service</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{booking.service_name}</p>
                </div>
              )}
              {booking.venue_name && (
                <div>
                  <p className="text-xs text-gray-400">Venue</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{booking.venue_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Booked</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {format(parseISO(booking.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              {booking.follow_up_due_date && (
                <div>
                  <p className="text-xs text-gray-400">Due Date</p>
                  <p className={`mt-0.5 text-sm font-semibold ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {overdue && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                    {format(parseISO(booking.follow_up_due_date), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Notes & Log</p>
            <Textarea
              placeholder="Record follow-up attempts, contact notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none border-gray-200 text-sm focus:border-[#C9A96E] focus:ring-[#C9A96E]/20"
            />
            <Button
              size="sm"
              onClick={saveNotes}
              disabled={savingNotes}
              className="mt-3 w-full rounded-lg bg-[#6B4423] hover:bg-[#4A2C1A]"
            >
              {savingNotes ? 'Saving…' : 'Save Notes'}
            </Button>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function FollowUpTab({
  initialBookings,
  admins,
}: {
  initialBookings: FollowUpBooking[];
  admins: AdminUser[];
}) {
  const [bookings, setBookings] = useState<FollowUpBooking[]>(initialBookings);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FollowUpFilters>({
    status: 'all', assignedTo: 'all', dueDateFrom: '', dueDateTo: '', overdueOnly: false,
  });
  const [selected, setSelected] = useState<FollowUpBooking | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; total: number } | null>(null);

  const handleSendEmails = async () => {
    setIsSendingEmails(true);
    setEmailResult(null);
    try {
      const result = await triggerFollowUpEmails();
      setEmailResult({ sent: result.sent, total: result.total });
    } catch (err: any) {
      console.error('Follow-up email trigger failed:', err);
      setEmailResult({ sent: -1, total: 0 }); // -1 signals error
    } finally {
      setIsSendingEmails(false);
    }
  };

  // Real-time subscription — bookings table
  useEffect(() => {
    const supabase = createClient();

    const channel = subscribeToTable<any>('bookings', async ({ eventType, new: next, old }) => {
      if (eventType === 'INSERT') {
        if (!next?.follow_up) return;

        // Fetch missing profile and service data for the new booking
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('services(name), branches(name)')
          .eq('id', next.id)
          .single();

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, email, phone')
          .eq('user_id', next.user_id)
          .single();

        const enriched: FollowUpBooking = {
          ...next,
          customer_name: profileData ? `${profileData.first_name ?? ''} ${profileData.last_name ?? ''}`.trim() || profileData.email : null,
          customer_email: profileData?.email ?? null,
          customer_phone: profileData?.phone ?? null,
          service_name: (bookingData?.services as any)?.name ?? null,
          venue_name: (bookingData?.branches as any)?.name ?? null,
        };

        setBookings((prev) => [enriched, ...prev]);
        return;
      }

      setBookings((prev) => {
        if (eventType === 'UPDATE') {
          // If the row is already in state, merge the update
          const exists = prev.some((b) => b.id === next?.id);
          if (exists) {
            // If follow_up was toggled OFF, remove it from view
            if (next?.follow_up === false) return prev.filter((b) => b.id !== next.id);
            return prev.map((b) => (b.id === next.id ? { ...b, ...next } : b));
          }
          // Row wasn't in state yet — we could fetch it here too, but for now we skip
          // as it's less common for a booking to "become" a follow-up later via update
          // without having been seen before.
          return prev;
        }
        if (eventType === 'DELETE') {
          return prev.filter((b) => b.id !== old?.id);
        }
        return prev;
      });
    });
    return () => { unsubscribe(channel); };
  }, []);


  const handleUpdated = useCallback((updated: FollowUpBooking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelected(updated);
  }, []);

  const handleInlineStatusChange = async (bookingId: string, status: FollowUpStatus) => {
    setUpdatingStatus(bookingId);
    try {
      await updateFollowUpStatus(bookingId, status);
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, follow_up_status: status } : b));
    } catch (err) {
      console.error('Error updating follow-up status', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Filter + search + sort by due date
  const visible = bookings
    .filter((b) => {
      const q = search.toLowerCase();
      const matchSearch = !q || [b.customer_name, b.customer_email, b.booking_number, b.service_name].some((f) => f?.toLowerCase().includes(q));
      const matchStatus = filters.status === 'all' || b.follow_up_status === filters.status;
      const matchAssigned = filters.assignedTo === 'all'
        || (filters.assignedTo === 'unassigned' ? !b.follow_up_assigned_to : b.follow_up_assigned_to === filters.assignedTo);
      const matchDueFrom = !filters.dueDateFrom || (b.follow_up_due_date && b.follow_up_due_date >= filters.dueDateFrom);
      const matchDueTo = !filters.dueDateTo || (b.follow_up_due_date && b.follow_up_due_date <= filters.dueDateTo + 'T23:59:59');
      const matchOverdue = !filters.overdueOnly || isOverdue(b.follow_up_due_date);
      return matchSearch && matchStatus && matchAssigned && matchDueFrom && matchDueTo && matchOverdue;
    })
    .sort((a, b) => {
      // Sort by due date ascending, nulls last
      if (!a.follow_up_due_date && !b.follow_up_due_date) return 0;
      if (!a.follow_up_due_date) return 1;
      if (!b.follow_up_due_date) return -1;
      return a.follow_up_due_date.localeCompare(b.follow_up_due_date);
    });

  const adminMap = Object.fromEntries(admins.map((a) => [a.user_id, `${a.first_name ?? ''} ${a.last_name ?? a.email}`.trim()]));

  // Stats
  const total = bookings.length;
  const pending = bookings.filter((b) => b.follow_up_status === 'pending').length;
  const contacted = bookings.filter((b) => b.follow_up_status === 'contacted').length;
  const completed = bookings.filter((b) => b.follow_up_status === 'completed').length;

  const hasActiveFilters = filters.status !== 'all' || filters.assignedTo !== 'all' || !!filters.dueDateFrom || !!filters.dueDateTo || filters.overdueOnly;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Follow-Ups</p>
              <p className="text-3xl font-bold mt-1">{total}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400">{pending}</p>
            </div>
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/20 p-3">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Contacted</p>
              <p className="text-3xl font-bold mt-1 text-blue-600 dark:text-blue-400">{contacted}</p>
            </div>
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-3">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{completed}</p>
            </div>
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer, booking ref, service…"
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
                {[filters.status !== 'all', filters.assignedTo !== 'all', !!filters.dueDateFrom, !!filters.dueDateTo, filters.overdueOnly].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters({ status: 'all', assignedTo: 'all', dueDateFrom: '', dueDateTo: '', overdueOnly: false })}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {/* Follow-up email trigger */}
          <Button
            variant="outline"
            onClick={handleSendEmails}
            disabled={isSendingEmails}
            className="shrink-0 gap-2"
            title="Send follow-up emails to all customers whose 2-week window has elapsed"
          >
            <Send className="h-4 w-4" />
            {isSendingEmails ? 'Sending…' : 'Send Follow-Up Emails'}
          </Button>
        </div>

        {filterOpen && (
          <FollowUpFilterPanel filters={filters} onFiltersChange={setFilters} admins={admins} />
        )}
      </div>

      {/* Email send result banner */}
      {emailResult && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${emailResult.sent === -1
            ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
            : 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400'
          }`}>
          {emailResult.sent === -1 ? (
            <><AlertTriangle className="h-4 w-4 shrink-0" /> Failed to send emails. Check that email credentials are configured.</>
          ) : emailResult.total === 0 ? (
            <><CheckCircle2 className="h-4 w-4 shrink-0" /> No follow-up emails due right now.</>
          ) : (
            <><Mail className="h-4 w-4 shrink-0" /> Sent {emailResult.sent} of {emailResult.total} follow-up emails.</>
          )}
          <button onClick={() => setEmailResult(null)} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Booking Ref</TableHead>
                <TableHead>Service / Venue</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Calendar className="h-12 w-12 text-muted-foreground/40" />
                      <p className="text-lg font-medium">No follow-ups found</p>
                      <p className="text-sm text-muted-foreground">Follow-ups from bookings will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((b) => {
                  const overdue = isOverdue(b.follow_up_due_date);
                  const dueSoon = isDueSoon(b.follow_up_due_date);
                  const rowClass = overdue
                    ? 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-950/30'
                    : dueSoon
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/30'
                      : 'hover:bg-muted/50';

                  return (
                    <TableRow
                      key={b.id}
                      className={`cursor-pointer transition-colors ${rowClass}`}
                      onClick={() => setSelected(b)}
                    >
                      <TableCell>
                        <div className="font-medium">{b.customer_name ?? '—'}</div>
                        {b.customer_email && (
                          <div className="text-xs text-muted-foreground">{b.customer_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {b.booking_number ? `#${b.booking_number}` : `#${b.id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{b.service_name ?? '—'}</div>
                        {b.venue_name && (
                          <div className="text-xs text-muted-foreground">{b.venue_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        {format(parseISO(b.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {b.follow_up_due_date ? (
                          <span className={`text-sm font-medium ${overdue ? 'text-red-600 dark:text-red-400' : dueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                            {overdue && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                            {format(parseISO(b.follow_up_due_date), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={b.follow_up_status ?? 'pending'}
                          onValueChange={(v) => handleInlineStatusChange(b.id, v as FollowUpStatus)}
                          disabled={updatingStatus === b.id}
                        >
                          <SelectTrigger className="h-8 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.follow_up_assigned_to ? (adminMap[b.follow_up_assigned_to] ?? '—') : (
                          <span className="italic text-muted-foreground/60">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                        {b.follow_up_notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {visible.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            Showing {visible.length} of {total} follow-ups
          </div>
        )}
      </Card>

      {/* Detail panel */}
      <FollowUpDetailPanel
        booking={selected}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
