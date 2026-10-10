'use client';

import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">No prior data</span>;
  const positive = value >= 0;
  return (
    <div className="mt-2 flex items-center gap-1">
      {positive ? (
        <TrendingUp className="h-4 w-4 text-green-600" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-600" />
      )}
      <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {Math.abs(value).toFixed(1)}%
      </span>
      <span className="text-xs text-muted-foreground">vs prev period</span>
    </div>
  );
}

interface Props {
  totalRevenue: number;
  pendingRevenue: number;
  totalBookings: number;
  totalCustomers: number;
  revenueGrowth: number | null;
  bookingsGrowth: number | null;
  currency: string;
}

export function AnalyticsMetricCards({
  totalRevenue,
  pendingRevenue,
  totalBookings,
  totalCustomers,
  revenueGrowth,
  bookingsGrowth,
  currency,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(totalRevenue, currency)}</p>
            <GrowthBadge value={revenueGrowth} />
          </div>
          <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
            <p className="mt-2 text-3xl font-bold">{totalBookings}</p>
            <GrowthBadge value={bookingsGrowth} />
          </div>
          <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
            <p className="mt-2 text-3xl font-bold">{totalCustomers}</p>
            <p className="mt-2 text-xs text-muted-foreground">Registered users</p>
          </div>
          <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/20">
            <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pending Revenue</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(pendingRevenue, currency)}</p>
            <p className="mt-2 text-xs text-muted-foreground">From upcoming bookings</p>
          </div>
          <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/20">
            <Activity className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </Card>
    </div>
  );
}
