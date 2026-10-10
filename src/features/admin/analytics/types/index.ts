export interface AnalyticsBooking {
  id: string;
  status: string;
  starts_at: string;
  created_at: string;
  payment_amount_cents: number | null;
  payment_currency: string | null;
  payment_status: string | null;
  service: { id: string; name: string; currency: string; min_price_cents: number } | null;
  branch: { id: string; name: string } | null;
}

export interface FilterOption {
  id: string;
  name: string;
}

export interface AnalyticsData {
  bookings: AnalyticsBooking[];
  totalCustomers: number;
  branches: FilterOption[];
  specialists: FilterOption[];
  currency: string;
}

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export type DateRangePreset = 'all' | '7d' | '30d' | '90d' | '6m' | '1y';
