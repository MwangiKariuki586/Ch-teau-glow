'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AnalyticsData, DateRangePreset } from '../types';

function getDateRange(preset: DateRangePreset): { from: string; to: string } | null {
  if (preset === 'all') return null;

  const to = new Date();
  const from = new Date();

  switch (preset) {
    case '7d':  from.setDate(to.getDate() - 7); break;
    case '30d': from.setDate(to.getDate() - 30); break;
    case '90d': from.setDate(to.getDate() - 90); break;
    case '6m':  from.setMonth(to.getMonth() - 6); break;
    case '1y':  from.setFullYear(to.getFullYear() - 1); break;
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [branchId, setBranchId] = useState<string>('');
  const [specialistId, setSpecialistId] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const range = getDateRange(preset);
      if (range) {
        params.set('date_from', range.from);
        params.set('date_to', range.to);
      }
      if (branchId) params.set('branch_id', branchId);
      if (specialistId) params.set('specialist_id', specialistId);

      const res = await fetch(`/api/admin/analytics?${params}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [preset, branchId, specialistId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    preset,
    setPreset,
    branchId,
    setBranchId,
    specialistId,
    setSpecialistId,
    refresh: fetchData,
  };
}
