import type { AnalyticsBooking } from '../types';

// Revenue: use actual captured payment amount, fall back to service list price
function getBookingRevenue(b: AnalyticsBooking): number {
  if (b.payment_amount_cents) return b.payment_amount_cents / 100;
  if (b.service?.min_price_cents) return b.service.min_price_cents / 100;
  return 0;
}

export function computeMetrics(bookings: AnalyticsBooking[]) {
  // Revenue earned: payment succeeded, or booking completed (may have been paid offline)
  const earned = bookings.filter(
    (b) => b.payment_status === 'succeeded' || b.status === 'completed',
  );
  // Pending revenue: active bookings not yet paid
  const pending = bookings.filter(
    (b) =>
      (b.status === 'pending' || b.status === 'confirmed' || b.status === 'rescheduled') &&
      b.payment_status !== 'succeeded',
  );

  const totalRevenue = earned.reduce((sum, b) => sum + getBookingRevenue(b), 0);
  const pendingRevenue = pending.reduce((sum, b) => sum + getBookingRevenue(b), 0);

  const byStatus = {
    completed: bookings.filter((b) => b.status === 'completed').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    no_show: bookings.filter((b) => b.status === 'no_show').length,
    rescheduled: bookings.filter((b) => b.status === 'rescheduled').length,
  };

  return { totalRevenue, pendingRevenue, byStatus };
}

// Groups bookings into monthly buckets derived from the actual data range
export function computeMonthlyTrends(bookings: AnalyticsBooking[]) {
  if (bookings.length === 0) return [];

  // Find the actual date range in the data
  const dates = bookings.map((b) => new Date(b.starts_at).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  // Build month buckets from earliest to latest booking
  const buckets: { month: string; year: number; monthIndex: number }[] = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  while (cursor <= end) {
    buckets.push({
      month: cursor.toLocaleString('default', { month: 'short', year: '2-digit' }),
      year: cursor.getFullYear(),
      monthIndex: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Cap at 24 buckets to keep the chart readable — take the most recent ones
  const visible = buckets.slice(-24);

  return visible.map(({ month, year, monthIndex }) => {
    const monthBookings = bookings.filter((b) => {
      const d = new Date(b.starts_at);
      return d.getMonth() === monthIndex && d.getFullYear() === year;
    });

    const revenue = monthBookings
      .filter((b) => b.payment_status === 'succeeded' || b.status === 'completed')
      .reduce((sum, b) => sum + getBookingRevenue(b), 0);

    return { month, bookings: monthBookings.length, revenue };
  });
}

// Supabase joins can return single object or array — normalise to single
function toSingle<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

function isEarned(b: AnalyticsBooking): boolean {
  return b.payment_status === 'succeeded' || b.status === 'completed';
}

export function computeTopBranches(bookings: AnalyticsBooking[], limit = 5) {
  const map: Record<string, { name: string; count: number; revenue: number }> = {};

  for (const b of bookings) {
    const branch = toSingle(b.branch as any);
    if (!branch) continue;
    const key = (branch as { id: string }).id;
    const name = (branch as { name: string }).name;
    if (!map[key]) map[key] = { name, count: 0, revenue: 0 };
    map[key].count++;
    if (isEarned(b)) map[key].revenue += getBookingRevenue(b);
  }

  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function computeTopServices(bookings: AnalyticsBooking[], limit = 5) {
  const map: Record<string, { name: string; count: number; revenue: number }> = {};

  for (const b of bookings) {
    const service = toSingle(b.service as any);
    if (!service) continue;
    const key = (service as { id: string }).id;
    const name = (service as { name: string }).name;
    const minPrice = (service as { min_price_cents: number }).min_price_cents;
    if (!map[key]) map[key] = { name, count: 0, revenue: 0 };
    map[key].count++;
    if (isEarned(b)) map[key].revenue += getBookingRevenue(b);
  }

  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// Returns null growth when there's no prior period data to compare against
export function computeGrowth(monthly: { revenue: number; bookings: number }[]) {
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];

  const revenueGrowth =
    prev?.revenue > 0 ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : null;
  const bookingsGrowth =
    prev?.bookings > 0 ? ((last.bookings - prev.bookings) / prev.bookings) * 100 : null;

  return { revenueGrowth, bookingsGrowth };
}
