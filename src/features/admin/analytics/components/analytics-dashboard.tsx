'use client';

import { useMemo } from 'react';
import { useAnalyticsData } from '../hooks/use-analytics-data';
import { computeMetrics, computeMonthlyTrends, computeTopBranches, computeTopServices, computeGrowth } from '../utils/analytics-compute';
import { AnalyticsFilters } from './analytics-filters';
import { AnalyticsMetricCards } from './analytics-metric-cards';
import { AnalyticsCharts } from './analytics-charts';
import { AnalyticsTables } from './analytics-tables';

export function AnalyticsDashboard() {
  const {
    data,
    loading,
    error,
    preset,
    setPreset,
    branchId,
    setBranchId,
    specialistId,
    setSpecialistId,
    refresh,
  } = useAnalyticsData();

  const computed = useMemo(() => {
    if (!data) return null;
    const monthly = computeMonthlyTrends(data.bookings);
    const { revenueGrowth, bookingsGrowth } = computeGrowth(monthly);
    return {
      ...computeMetrics(data.bookings),
      monthly,
      revenueGrowth,
      bookingsGrowth,
      topBranches: computeTopBranches(data.bookings),
      topServices: computeTopServices(data.bookings),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your business performance and insights
          </p>
        </div>
        {data && (
          <AnalyticsFilters
            preset={preset}
            onPresetChange={setPreset}
            branchId={branchId}
            onBranchChange={setBranchId}
            specialistId={specialistId}
            onSpecialistChange={setSpecialistId}
            branches={data.branches}
            specialists={data.specialists}
            loading={loading}
            onRefresh={refresh}
          />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !computed && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {computed && data && (
        <>
          <AnalyticsMetricCards
            totalRevenue={computed.totalRevenue}
            pendingRevenue={computed.pendingRevenue}
            totalBookings={data.bookings.length}
            totalCustomers={data.totalCustomers}
            revenueGrowth={computed.revenueGrowth}
            bookingsGrowth={computed.bookingsGrowth}
            currency={data.currency}
          />

          <AnalyticsCharts
            monthlyData={computed.monthly}
            byStatus={computed.byStatus}
            currency={data.currency}
          />

          <AnalyticsTables
            topBranches={computed.topBranches}
            topServices={computed.topServices}
            currency={data.currency}
          />
        </>
      )}
    </div>
  );
}
