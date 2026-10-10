'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type {
  RecoveryCase,
  RecoveryFilters,
  RecoveryView,
  RecoveryStats,
} from '../types';
import { MOCK_ACTIONS, MOCK_PLAYBOOKS } from '../utils/mock-data';
import { fetchRecoveryCases, deriveStats, updateRecoveryCase } from '../api';

export function useRecoveryCases() {
  const [allCases, setAllCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [view, setView] = useState<RecoveryView>('inbox');
  const [filters, setFilters] = useState<RecoveryFilters>({
    status: 'all',
    severity: 'all',
    branch: 'all',
    overdue: false,
    search: '',
  });

  // Playbook step state (keyed by step id)
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    MOCK_PLAYBOOKS.forEach((pb) =>
      pb.steps.forEach((s) => { initial[s.id] = s.isCompleted; })
    );
    return initial;
  });

  // ── Fetch from Supabase ────────────────────────────────────────────────────
  const loadCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cases = await fetchRecoveryCases();
      setAllCases(cases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filteredCases = useMemo(() => {
    return allCases.filter((c) => {
      if (filters.status !== 'all' && c.status !== filters.status) return false;
      if (filters.severity !== 'all' && c.severity !== filters.severity) return false;
      if (filters.branch !== 'all' && c.branchName !== filters.branch) return false;
      if (filters.overdue && !c.isOverdue) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !c.clientName.toLowerCase().includes(q) &&
          !c.caseNumber.toLowerCase().includes(q) &&
          !c.issueType.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allCases, filters]);

  const stats: RecoveryStats = useMemo(() => deriveStats(allCases), [allCases]);

  const selectedCase = useMemo(
    () => allCases.find((c) => c.id === selectedCaseId) ?? null,
    [allCases, selectedCaseId]
  );

  const caseTimeline = useMemo(
    () => (selectedCaseId ? (MOCK_ACTIONS[selectedCaseId] ?? []) : []),
    [selectedCaseId]
  );

  const casePlaybook = useMemo(() => {
    if (!selectedCase) return null;
    const pb = MOCK_PLAYBOOKS.find(
      (p) => p.issueType === selectedCase.issueType || p.severity === selectedCase.severity
    );
    if (!pb) return null;
    return {
      ...pb,
      steps: pb.steps.map((s) => ({
        ...s,
        isCompleted: completedSteps[s.id] ?? s.isCompleted,
      })),
    };
  }, [selectedCase, completedSteps]);

  const branches = useMemo(
    () => Array.from(new Set(allCases.map((c) => c.branchName).filter(Boolean))) as string[],
    [allCases]
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const openCase = (id: string) => {
    setSelectedCaseId(id);
    setView('detail');
  };

  const closeDetail = () => {
    setSelectedCaseId(null);
    setView('inbox');
  };

  const togglePlaybookStep = (stepId: string) => {
    setCompletedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const updateFilter = <K extends keyof RecoveryFilters>(key: K, value: RecoveryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: 'all', severity: 'all', branch: 'all', overdue: false, search: '' });
  };

  const handleUpdateCase = async (
    id: string,
    updates: Partial<Pick<RecoveryCase, 'status' | 'severity' | 'assignedTo' | 'tags' | 'isOverdue'>>
  ) => {
    try {
      const updated = await updateRecoveryCase(id, updates);
      setAllCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      console.error('Failed to update case:', err);
    }
  };

  return {
    cases: filteredCases,
    allCases,
    loading,
    error,
    refetch: loadCases,
    selectedCase,
    caseTimeline,
    casePlaybook,
    view,
    setView,
    filters,
    updateFilter,
    resetFilters,
    openCase,
    closeDetail,
    togglePlaybookStep,
    handleUpdateCase,
    stats,
    branches,
  };
}
