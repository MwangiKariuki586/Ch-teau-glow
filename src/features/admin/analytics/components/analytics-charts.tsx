'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';

interface MonthlyPoint {
  month: string;
  bookings: number;
  revenue: number;
}

interface BookingStatusData {
  completed: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  no_show: number;
  rescheduled: number;
}

interface Props {
  monthlyData: MonthlyPoint[];
  byStatus: BookingStatusData;
  currency: string;
}

function formatCurrency(v: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(v);
}

export function AnalyticsCharts({ monthlyData, byStatus, currency }: Props) {
  const statusData = [
    { name: 'Completed', value: byStatus.completed, fill: '#22c55e' },
    { name: 'Confirmed', value: byStatus.confirmed, fill: '#3b82f6' },
    { name: 'Pending', value: byStatus.pending, fill: '#eab308' },
    { name: 'Cancelled', value: byStatus.cancelled, fill: '#ef4444' },
    { name: 'No Show', value: byStatus.no_show, fill: '#f97316' },
    { name: 'Rescheduled', value: byStatus.rescheduled, fill: '#a855f7' },
  ].filter((s) => s.value > 0); // only show statuses that have data

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Revenue trend */}
      <Card className="p-6">
        <h2 className="mb-6 text-lg font-semibold">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => formatCurrency(v, currency)}
              width={70}
            />
            <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Bookings per month */}
      <Card className="p-6">
        <h2 className="mb-6 text-lg font-semibold">Bookings per Period</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bookings" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Booking status breakdown */}
      <Card className="p-6 lg:col-span-2">
        <h2 className="mb-6 text-lg font-semibold">Booking Status Breakdown</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statusData.map((s) => (
            <div key={s.name} className="rounded-lg border p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">{s.name}</p>
              <p className="mt-2 text-3xl font-bold" style={{ color: s.fill }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
