'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { RecoveryFilters, CaseStatus, CaseSeverity } from '../types';

interface RecoveryFiltersProps {
  filters: RecoveryFilters;
  branches: string[];
  onUpdate: <K extends keyof RecoveryFilters>(key: K, value: RecoveryFilters[K]) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { label: string; value: CaseStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const SEVERITY_OPTIONS: { label: string; value: CaseSeverity | 'all' }[] = [
  { label: 'All Severities', value: 'all' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export function RecoveryFiltersBar({
  filters,
  branches,
  onUpdate,
  onReset,
}: RecoveryFiltersProps) {
  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.severity !== 'all' ||
    filters.branch !== 'all' ||
    filters.overdue ||
    filters.search !== '';

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by client, case number, or issue type…"
          value={filters.search}
          onChange={(e) => onUpdate('search', e.target.value)}
          className="pl-9 bg-white border-gray-200"
        />
        {filters.search && (
          <button
            onClick={() => onUpdate('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-gray-400 shrink-0" />

        <Select
          value={filters.status}
          onValueChange={(v) => onUpdate('status', v as CaseStatus | 'all')}
        >
          <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-auto sm:min-w-[130px] bg-white border-gray-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.severity}
          onValueChange={(v) => onUpdate('severity', v as CaseSeverity | 'all')}
        >
          <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-auto sm:min-w-[140px] bg-white border-gray-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.branch}
          onValueChange={(v) => onUpdate('branch', v)}
        >
          <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-auto sm:min-w-[140px] bg-white border-gray-200 text-sm">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={() => onUpdate('overdue', !filters.overdue)}
          className={cn(
            'h-8 px-3 rounded-md text-sm font-medium border transition-colors whitespace-nowrap',
            filters.overdue
              ? 'bg-orange-100 border-orange-300 text-orange-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          Overdue only
        </button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="mr-1 h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
