'use client';

import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecoveryCase, RecoveryStats } from '../types';
import { statusConfig, severityConfig } from './recovery-case-card';

interface RecoveryAnalyticsProps {
  cases: RecoveryCase[];
  stats: RecoveryStats;
}

export function RecoveryAnalytics({ cases, stats }: RecoveryAnalyticsProps) {
  // Compute breakdown by status
  const byStatus = {
    open: cases.filter((c) => c.status === 'open').length,
    in_progress: cases.filter((c) => c.status === 'in_progress').length,
    escalated: cases.filter((c) => c.status === 'escalated').length,
    resolved: cases.filter((c) => c.status === 'resolved').length,
    closed: cases.filter((c) => c.status === 'closed').length,
  };

  // Compute breakdown by severity
  const bySeverity = {
    critical: cases.filter((c) => c.severity === 'critical').length,
    high: cases.filter((c) => c.severity === 'high').length,
    medium: cases.filter((c) => c.severity === 'medium').length,
    low: cases.filter((c) => c.severity === 'low').length,
  };

  // Compute breakdown by issue type
  const byIssueType = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.issueType] = (acc[c.issueType] ?? 0) + 1;
    return acc;
  }, {});

  const topIssues = Object.entries(byIssueType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxIssueCount = topIssues[0]?.[1] ?? 1;

  // Compute breakdown by branch
  const byBranch = cases.reduce<Record<string, number>>((acc, c) => {
    if (c.branchName) acc[c.branchName] = (acc[c.branchName] ?? 0) + 1;
    return acc;
  }, {});

  const branchEntries = Object.entries(byBranch).sort((a, b) => b[1] - a[1]);
  const maxBranchCount = branchEntries[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <BarChart3 className="h-4 w-4 text-[#6B4423]" />
            Cases by Status
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(byStatus) as [keyof typeof byStatus, number][]).map(
              ([status, count]) => {
                const cfg = statusConfig(status);
                return (
                  <div
                    key={status}
                    className={cn(
                      'rounded-lg border p-3 flex items-center justify-between',
                      cfg.className
                    )}
                  >
                    <span className="text-xs font-medium">{cfg.label}</span>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Severity breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <AlertTriangle className="h-4 w-4 text-[#6B4423]" />
            Cases by Severity
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(bySeverity) as [keyof typeof bySeverity, number][]).map(
              ([severity, count]) => {
                const cfg = severityConfig(severity);
                return (
                  <div
                    key={severity}
                    className={cn(
                      'rounded-lg border p-3 flex items-center justify-between',
                      cfg.className
                    )}
                  >
                    <span className="text-xs font-medium">{cfg.label}</span>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Top issue types */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Top Issue Types</h3>
          <div className="space-y-3">
            {topIssues.map(([type, count]) => (
              <div key={type}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{type}</span>
                  <span className="text-gray-500 text-xs">{count} cases</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6B4423] to-[#C9A96E] transition-all duration-500"
                    style={{ width: `${(count / maxIssueCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cases by branch */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Cases by Branch</h3>
          <div className="space-y-3">
            {branchEntries.map(([branch, count]) => (
              <div key={branch}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{branch}</span>
                  <span className="text-gray-500 text-xs">{count} cases</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C9A96E] to-[#6B4423] transition-all duration-500"
                    style={{ width: `${(count / maxBranchCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resolved cases summary */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-800">Resolution Summary</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-700">{stats.totalResolved}</p>
            <p className="text-xs text-emerald-600">Resolved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">{stats.totalClosed}</p>
            <p className="text-xs text-emerald-600">Closed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">
              {stats.totalResolved + stats.totalClosed > 0
                ? Math.round(
                    ((stats.totalResolved + stats.totalClosed) /
                      (stats.totalOpen +
                        stats.totalInProgress +
                        stats.totalEscalated +
                        stats.totalResolved +
                        stats.totalClosed)) *
                      100
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-emerald-600">Resolution Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
