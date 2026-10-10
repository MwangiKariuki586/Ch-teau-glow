'use client';

import { ShieldAlert, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecoveryStats } from '../types';

interface RecoveryStatsBarProps {
  stats: RecoveryStats;
}

export function RecoveryStatsBar({ stats }: RecoveryStatsBarProps) {
  const items = [
    {
      label: 'Open Cases',
      value: stats.totalOpen + stats.totalInProgress,
      icon: ShieldAlert,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
    {
      label: 'Escalated',
      value: stats.totalEscalated,
      icon: AlertTriangle,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
    {
      label: 'Overdue',
      value: stats.overdueCount,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    },
    {
      label: 'Closed',
      value: stats.totalClosed,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-4',
            item.bg,
            item.border
          )}
        >
          <div className={cn('rounded-lg p-2', 'bg-white/70')}>
            <item.icon className={cn('h-4 w-4', item.color)} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">{item.label}</p>
            <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
