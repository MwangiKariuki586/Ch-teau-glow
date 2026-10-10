'use client';

import { FileText, ArrowUpCircle, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecoveryAction } from '../types';

interface RecoveryCaseTimelineProps {
  actions: RecoveryAction[];
}

function actionIcon(type: RecoveryAction['type']) {
  switch (type) {
    case 'note':
      return <FileText className="h-3.5 w-3.5" />;
    case 'escalation':
      return <ArrowUpCircle className="h-3.5 w-3.5" />;
    case 'assignment':
      return <UserCheck className="h-3.5 w-3.5" />;
    case 'resolution':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5" />;
  }
}

function actionColor(type: RecoveryAction['type']) {
  switch (type) {
    case 'escalation':
      return 'bg-purple-100 text-purple-600 border-purple-200';
    case 'resolution':
      return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    case 'note':
      return 'bg-blue-100 text-blue-600 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecoveryCaseTimeline({ actions }: RecoveryCaseTimelineProps) {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">No activity recorded yet.</p>
    );
  }

  return (
    <ol className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
      {actions.map((action) => (
        <li key={action.id} className="relative">
          {/* Dot */}
          <span
            className={cn(
              'absolute -left-[1.35rem] flex h-5 w-5 items-center justify-center rounded-full border',
              actionColor(action.type)
            )}
          >
            {actionIcon(action.type)}
          </span>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="text-sm text-gray-800">{action.description}</p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
              <span className="font-medium text-gray-500">{action.performedBy}</span>
              <span>·</span>
              <span>{formatDateTime(action.performedAt)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
