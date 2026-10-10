'use client';

import { Clock, User, MapPin, Wrench, AlertTriangle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RecoveryCase, CaseSeverity, CaseStatus } from '../types';

interface RecoveryCaseCardProps {
  recoveryCase: RecoveryCase;
  onOpen: (id: string) => void;
}

export function severityConfig(severity: CaseSeverity) {
  switch (severity) {
    case 'critical':
      return { label: 'Critical', className: 'bg-rose-100 text-rose-800 border-rose-200' };
    case 'high':
      return { label: 'High', className: 'bg-orange-100 text-orange-800 border-orange-200' };
    case 'medium':
      return { label: 'Medium', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'low':
      return { label: 'Low', className: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
}

export function statusConfig(status: CaseStatus) {
  switch (status) {
    case 'open':
      return { label: 'Open', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'in_progress':
      return { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'escalated':
      return { label: 'Escalated', className: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'resolved':
      return { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'closed':
      return { label: 'Closed', className: 'bg-gray-50 text-gray-600 border-gray-200' };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function RecoveryCaseCard({ recoveryCase: c, onOpen }: RecoveryCaseCardProps) {
  const sev = severityConfig(c.severity);
  const sta = statusConfig(c.status);

  return (
    <button
      onClick={() => onOpen(c.id)}
      className={cn(
        'w-full text-left bg-white rounded-xl border p-5 transition-all duration-150',
        'hover:border-[#C9A96E]/60 hover:shadow-md',
        c.isOverdue ? 'border-orange-200' : 'border-gray-200',
        c.severity === 'critical' && 'border-l-4 border-l-rose-500'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: severity + info */}
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={cn(
              'mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-bold border',
              sev.className
            )}
          >
            {sev.label}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-gray-500">
                {c.caseNumber}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-sm font-semibold text-gray-900">{c.clientName}</span>
              {c.isOverdue && (
                <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-gray-800 mb-2">{c.issueType}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(c.createdAt)}
              </span>
              {c.branchName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {c.branchName}
                </span>
              )}
              {c.serviceName && (
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  {c.serviceName}
                </span>
              )}
              {c.assignedTo && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {c.assignedTo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: status + arrow */}
        <div className="flex items-center gap-2 sm:ml-4 shrink-0">
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium border',
              sta.className
            )}
          >
            {sta.label}
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </button>
  );
}
