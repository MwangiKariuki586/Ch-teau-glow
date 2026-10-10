'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DateRangePreset, FilterOption } from '../types';

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last year' },
];

interface AnalyticsFiltersProps {
  preset: DateRangePreset;
  onPresetChange: (v: DateRangePreset) => void;
  branchId: string;
  onBranchChange: (v: string) => void;
  specialistId: string;
  onSpecialistChange: (v: string) => void;
  branches: FilterOption[];
  specialists: FilterOption[];
  loading: boolean;
  onRefresh: () => void;
}

export function AnalyticsFilters({
  preset,
  onPresetChange,
  branchId,
  onBranchChange,
  specialistId,
  onSpecialistChange,
  branches,
  specialists,
  loading,
  onRefresh,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={preset} onValueChange={(v) => onPresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={branchId || 'all'} onValueChange={(v) => onBranchChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All branches</SelectItem>
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={specialistId || 'all'}
        onValueChange={(v) => onSpecialistChange(v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All specialists" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All specialists</SelectItem>
          {specialists.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
