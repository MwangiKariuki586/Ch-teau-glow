'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle, CheckCircle2, Clock, Filter, Inbox,
  Mail, MessageSquare, Search, X, ChevronDown, User,
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
import { subscribeToTable, unsubscribe } from '@/lib/supabase/realtime';
import {
  addEnquiryNote,
  assignEnquiry,
  markEnquiryFollowUpSent,
  updateEnquiryStatus,
} from '../api/enquiries';
import type { AdminUser, ContactEnquiry, EnquiryFilters } from '../types';

// ── Badge config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  normal: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

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
        <div className={`rounded-full p-3 ${colorClass.replace('text-', 'bg-').replace('-600', '-100').replace('-400', '-900/20')}`}>
          <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Inline Filter Panel ───────────────────────────────────────────────────────

function FilterPanel({
  filters, onFiltersChange, admins,
}: {
  filters: EnquiryFilters;
  onFiltersChange: (f: EnquiryFilters) => void;
  admins: AdminUser[];
}) {
  const reset = () => onFiltersChange({ status: 'all', priority: 'all', assignedTo: 'all', dateFrom: '', dateTo: '' });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Filter Enquiries</span>
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
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select
            value={filters.priority}
            onChange={e => onFiltersChange({ ...filters, priority: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E]"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
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

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function EnquiryDetailDrawer({
  enquiry, admins, onClose, onUpdated,
}: {
  enquiry: ContactEnquiry | null;
  admins: AdminUser[];
  onClose: () => void;
  onUpdated: (e: ContactEnquiry) => void;
}) {
  const [status, setStatus] = useState(enquiry?.status ?? 'new');
  const [assignedTo, setAssignedTo] = useState(enquiry?.assigned_to ?? '');
  const [notes, setNotes] = useState(enquiry?.admin_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [markingReplied, setMarkingReplied] = useState(false);

  useEffect(() => {
    if (enquiry) {
      setStatus(enquiry.status);
      setAssignedTo(enquiry.assigned_to ?? '');
      setNotes(enquiry.admin_notes ?? '');
    }
  }, [enquiry]);

  if (!enquiry) return null;

  const save = async () => {
    setSaving(true);
    try {
      if (status !== enquiry.status) await updateEnquiryStatus(enquiry.id, status);
      const newAssignee = assignedTo || null;
      if (newAssignee !== enquiry.assigned_to) await assignEnquiry(enquiry.id, newAssignee);
      if (notes !== (enquiry.admin_notes ?? '')) await addEnquiryNote(enquiry.id, notes);
      onUpdated({ ...enquiry, status: status as ContactEnquiry['status'], assigned_to: newAssignee, admin_notes: notes });
    } catch (err) {
      console.error('Error saving enquiry', err);
    } finally {
      setSaving(false);
    }
  };

  const markReplied = async () => {
    setMarkingReplied(true);
    try {
      await markEnquiryFollowUpSent(enquiry.id);
      onUpdated({ ...enquiry, follow_up_sent: true });
    } catch (err) {
      console.error('Error marking replied', err);
    } finally {
      setMarkingReplied(false);
    }
  };

  return (
    <Sheet open={!!enquiry} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Enquiry Details</SheetTitle>
        </SheetHeader>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#6B4423] to-[#4A2C1A] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <MessageSquare className="h-4 w-4 text-[#C9A96E]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/60">Enquiry</p>
                <h2 className="text-base font-bold text-white">{enquiry.name}</h2>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge className={priorityConfig[enquiry.priority]?.className}>
                {priorityConfig[enquiry.priority]?.label ?? enquiry.priority}
              </Badge>
              <Badge className={statusConfig[enquiry.status]?.className}>
                {statusConfig[enquiry.status]?.label ?? enquiry.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">

          {/* Contact card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Contact</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{enquiry.email}</span>
              </div>
              {enquiry.phone && (
                <div className="flex items-center gap-2.5">
                  <span className="text-gray-400 text-sm">📞</span>
                  <span className="text-sm text-gray-700">{enquiry.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {format(new Date(enquiry.created_at), 'MMM d, yyyy · h:mm a')}
                </span>
              </div>
            </div>
          </div>

          {/* Message card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">Subject</p>
            <p className="mb-3 font-semibold text-gray-900">{enquiry.subject}</p>
            <p className="text-sm leading-relaxed text-gray-600 rounded-lg bg-gray-50 p-3 border border-gray-100">
              {enquiry.message}
            </p>
          </div>

          {/* Actions card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Manage</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ContactEnquiry['status'])}>
                  <SelectTrigger className="h-9 text-sm border-gray-200 focus:border-[#C9A96E] focus:ring-[#C9A96E]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Assign To</Label>
                <Select value={assignedTo || 'unassigned'} onValueChange={(v) => setAssignedTo(v === 'unassigned' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm border-gray-200 focus:border-[#C9A96E] focus:ring-[#C9A96E]/20">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {admins.map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.first_name} {a.last_name || a.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Internal Notes</Label>
              <Textarea
                placeholder="Add an internal note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none border-gray-200 text-sm focus:border-[#C9A96E] focus:ring-[#C9A96E]/20"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-lg bg-[#6B4423] hover:bg-[#4A2C1A]"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={markReplied}
                disabled={markingReplied || !!enquiry.follow_up_sent}
                className="flex-1 rounded-lg border-gray-200"
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                {enquiry.follow_up_sent ? 'Replied ✓' : 'Mark Replied'}
              </Button>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function ContactEnquiriesTab({
  initialEnquiries,
  admins,
}: {
  initialEnquiries: ContactEnquiry[];
  admins: AdminUser[];
}) {
  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>(initialEnquiries);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<EnquiryFilters>({
    status: 'all', priority: 'all', assignedTo: 'all', dateFrom: '', dateTo: '',
  });
  const [selected, setSelected] = useState<ContactEnquiry | null>(null);

  // Real-time subscription
  useEffect(() => {
    const channel = subscribeToTable<ContactEnquiry>('contact_enquiries', ({ eventType, new: next, old }) => {
      setEnquiries((prev) => {
        if (eventType === 'INSERT') return [next, ...prev];
        if (eventType === 'UPDATE') return prev.map((e) => (e.id === next.id ? next : e));
        if (eventType === 'DELETE') return prev.filter((e) => e.id !== (old as ContactEnquiry).id);
        return prev;
      });
    });
    return () => { unsubscribe(channel); };
  }, []);

  const handleUpdated = useCallback((updated: ContactEnquiry) => {
    setEnquiries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setSelected(updated);
  }, []);

  // Filter + search
  const visible = enquiries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [e.name, e.email, e.subject].some((f) => f?.toLowerCase().includes(q));
    const matchStatus = filters.status === 'all' || e.status === filters.status;
    const matchPriority = filters.priority === 'all' || e.priority === filters.priority;
    const matchAssigned =
      filters.assignedTo === 'all' ||
      (filters.assignedTo === 'unassigned' ? !e.assigned_to : e.assigned_to === filters.assignedTo);
    const matchDateFrom = !filters.dateFrom || new Date(e.created_at) >= new Date(filters.dateFrom);
    const matchDateTo = !filters.dateTo || new Date(e.created_at) <= new Date(filters.dateTo + 'T23:59:59');
    return matchSearch && matchStatus && matchPriority && matchAssigned && matchDateFrom && matchDateTo;
  });

  // Stats
  const total = enquiries.length;
  const newCount = enquiries.filter((e) => e.status === 'new').length;
  const inProgressCount = enquiries.filter((e) => e.status === 'in_progress').length;
  const resolvedCount = enquiries.filter((e) => e.status === 'resolved').length;

  const adminMap = Object.fromEntries(admins.map((a) => [a.user_id, `${a.first_name ?? ''} ${a.last_name ?? a.email}`.trim()]));

  const hasActiveFilters = filters.status !== 'all' || filters.priority !== 'all' || filters.assignedTo !== 'all' || !!filters.dateFrom || !!filters.dateTo;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total Enquiries" value={total} icon={Inbox} colorClass="text-primary" />
        <StatCard title="New" value={newCount} icon={AlertCircle} colorClass="text-blue-600 dark:text-blue-400" />
        <StatCard title="In Progress" value={inProgressCount} icon={Clock} colorClass="text-amber-600 dark:text-amber-400" />
        <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle2} colorClass="text-green-600 dark:text-green-400" />
      </div>

      {/* Search + Filter toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or subject…"
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
                {[filters.status !== 'all', filters.priority !== 'all', filters.assignedTo !== 'all', !!filters.dateFrom, !!filters.dateTo].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters({ status: 'all', priority: 'all', assignedTo: 'all', dateFrom: '', dateTo: '' })}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {filterOpen && (
          <FilterPanel filters={filters} onFiltersChange={setFilters} admins={admins} />
        )}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Inbox className="h-12 w-12 text-muted-foreground/40" />
                      <p className="text-lg font-medium text-foreground">No enquiries found</p>
                      <p className="text-sm text-muted-foreground">
                        Contact enquiries will appear here.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelected(e)}
                  >
                    <TableCell>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-muted-foreground">{e.email}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{e.subject}</TableCell>
                    <TableCell>
                      <Badge className={priorityConfig[e.priority]?.className ?? ''}>
                        {priorityConfig[e.priority]?.label ?? e.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[e.status]?.className ?? ''}>
                        {statusConfig[e.status]?.label ?? e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.assigned_to ? (adminMap[e.assigned_to] ?? '—') : (
                        <span className="italic text-muted-foreground/60">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(e.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {visible.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            Showing {visible.length} of {total} enquiries
          </div>
        )}
      </Card>

      {/* Detail drawer */}
      <EnquiryDetailDrawer
        enquiry={selected}
        admins={admins}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
