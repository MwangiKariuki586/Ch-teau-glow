'use client';

import { ShieldAlert, Inbox, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRecoveryCases } from '../hooks/use-recovery-cases';
import { RecoveryStatsBar } from './recovery-stats-bar';
import { RecoveryFiltersBar } from './recovery-filters';
import { RecoveryCaseCard } from './recovery-case-card';
import { RecoveryCaseDetail } from './recovery-case-detail';
import { RecoveryAnalytics } from './recovery-analytics';
import type { RecoveryView } from '../types';

const VIEW_TABS: { id: RecoveryView; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Recovery Inbox', icon: Inbox },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function RecoveryCenterPage() {
  const {
    cases,
    allCases,
    loading,
    error,
    refetch,
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
  } = useRecoveryCases();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-xl bg-rose-100 p-2 sm:p-2.5 shrink-0">
            <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Service Recovery</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {loading ? 'Loading cases\u2026' : (
                <>
                  {stats.totalOpen + stats.totalInProgress} active{' '}
                  {stats.totalOpen + stats.totalInProgress === 1 ? 'case requires' : 'cases require'}{' '}
                  attention
                  {stats.overdueCount > 0 && (
                    <span className="ml-2 text-orange-600 font-medium">
                      &middot; {stats.overdueCount} overdue
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={loading}
          className="text-gray-600 shrink-0"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error} &mdash;{' '}
          <button onClick={refetch} className="underline font-medium">retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Stats bar */}
      {!loading && <RecoveryStatsBar stats={stats} />}

      {/* View tabs */}
      {!loading && view !== 'detail' && (
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-full sm:w-fit">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={cn(
                'flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
                view === tab.id
                  ? 'bg-white text-[#6B4423] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Inbox */}
      {!loading && view === 'inbox' && (
        <div className="space-y-4">
          <RecoveryFiltersBar
            filters={filters}
            branches={branches}
            onUpdate={updateFilter}
            onReset={resetFilters}
          />
          {cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <ShieldAlert className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No recovery cases found</p>
              <p className="text-xs text-gray-400 mt-1">
                Cases submitted by customers will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <RecoveryCaseCard key={c.id} recoveryCase={c} onOpen={openCase} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail */}
      {!loading && view === 'detail' && selectedCase && (
        <RecoveryCaseDetail
          recoveryCase={selectedCase}
          timeline={caseTimeline}
          playbook={casePlaybook}
          onBack={closeDetail}
          onToggleStep={togglePlaybookStep}
          onUpdateCase={handleUpdateCase}
        />
      )}

      {/* Analytics */}
      {!loading && view === 'analytics' && (
        <RecoveryAnalytics cases={allCases} stats={stats} />
      )}
    </div>
  );
}
