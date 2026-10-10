'use client';

import { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Loader2,
  Pencil,
  XCircle,
  AlertTriangle,
} from 'lucide-react';import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  ISSUE_PRIORITY_MAP,
  type CustomerComplaint,
  type ComplaintStatus,
  type IssueType,
} from '../types';
import { ComplaintForm } from './complaint-form';

// Customer-facing status — internal statuses are abstracted away
function statusBadge(status: string) {
  if (status === 'resolved' || status === 'closed') {
    return { label: 'Closed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  // open, in_progress, escalated, or any unknown value → Open
  return { label: 'Open', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
}

function canEdit(status: string) {
  return status === 'open' || status === 'in_progress';
}

function canWithdraw(status: string) {
  // Explicitly only allow withdrawal on truly active states
  return status === 'open' || status === 'in_progress' || status === 'escalated';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function MyComplaintsList() {
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/complaints');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setComplaints(json.data ?? []);
    } catch {
      setError('Could not load your complaints. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  function handleEditSuccess(updated: CustomerComplaint) {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setEditingId(null);
  }

  async function handleWithdraw() {
    if (!withdrawId) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/complaints/${withdrawId}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? 'Failed to withdraw complaint.');
        return;
      }
      // Mark as closed locally
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === withdrawId ? { ...c, status: 'closed' as ComplaintStatus } : c
        )
      );
    } finally {
      setWithdrawing(false);
      setWithdrawId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </p>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
        <CheckCircle2 className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No complaints submitted yet</p>
        <p className="mt-1 text-xs text-gray-400">Use the form to report an issue with a service.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {complaints.map((c) => {
          const sta = statusBadge(c.status);
          const isEditing = editingId === c.id;

          return (
            <div
              key={c.id}
              className={cn(
                'rounded-xl border bg-white overflow-hidden',
                c.severity === 'critical' && 'border-l-4 border-l-rose-500',
                c.severity === 'high'     && 'border-l-4 border-l-orange-400',
                c.severity === 'medium'   && 'border-l-4 border-l-amber-400',
                c.severity === 'low'      && 'border-l-4 border-l-blue-400',
                !isEditing && 'border-gray-200',
                isEditing && 'border-[#C9A96E]',
              )}
            >
              {/* Card header */}
              <div className="p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs font-mono font-semibold text-gray-400 shrink-0">
                      {c.case_number}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {c.issue_type}
                    </span>
                  </div>
                  <span className={cn('shrink-0 rounded-full border px-3 py-0.5 text-xs font-medium', sta.cls)}>
                    {sta.label}
                  </span>
                </div>

                {/* Description */}
                {!isEditing && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.issue_description}</p>
                )}

                {/* Response time hint — no severity/priority labels shown to customer */}
                {(() => {
                  const cls = ISSUE_PRIORITY_MAP[c.issue_type as IssueType];
                  if (!cls) return null;
                  return (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <Clock className="h-3 w-3 shrink-0" />
                      Expected response within <strong className="ml-0.5">{cls.slaHours} hours</strong>
                    </p>
                  );
                })()}

                {/* Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(c.created_at)}
                  </span>
                  {c.service_name && <span>{c.service_name}</span>}
                  {c.branch_name && <span>{c.branch_name}</span>}
                  {(c.closed_at || c.resolved_at) && (
                    <span className="text-emerald-600">
                      Closed {formatDate((c.closed_at || c.resolved_at)!)}
                    </span>
                  )}
                </div>

                {/* Action buttons — only for editable statuses */}
                {!isEditing && (canEdit(c.status) || canWithdraw(c.status)) && (
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    {canEdit(c.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-gray-600 hover:text-[#6B4423] hover:bg-[#FFF8F0]"
                        onClick={() => setEditingId(c.id)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                    {canWithdraw(c.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-gray-600 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => setWithdrawId(c.id)}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Withdraw
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div className="border-t border-[#C9A96E]/30 bg-[#FFF8F0] p-4">
                  <ComplaintForm
                    editingComplaint={c}
                    onEditSuccess={handleEditSuccess}
                    onCancelEdit={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Withdraw confirmation dialog */}
      <AlertDialog open={!!withdrawId} onOpenChange={(open) => !open && setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Withdraw Complaint
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this complaint? This will close the case and
              our team will stop working on it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>Keep Complaint</AlertDialogCancel>
            <AlertDialogAction
              disabled={withdrawing}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleWithdraw}
            >
              {withdrawing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Withdrawing…</>
              ) : (
                'Yes, Withdraw'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
