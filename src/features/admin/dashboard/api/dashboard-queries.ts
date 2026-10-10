import { createClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/database.types';

export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalBookings: number;
  bookingsChange: number;
  totalCustomers: number;
  customersChange: number;
  activeServices: number;
  servicesChange: number;
}

export interface RecentBooking {
  id: string;
  customer: string;
  email: string;
  service: string;
  date: string;
  status: string;
  amount: string;
}

export interface PopularService {
  name: string;
  clinic: string;
  revenue: string;
  initials: string;
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
  bookings: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  
  // Get current month and previous month dates
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get current month bookings
  const { data: currentBookings } = await supabase
    .from('bookings')
    .select('*, services(min_price_cents, max_price_cents)')
    .gte('created_at', currentMonthStart.toISOString())
    .eq('status', 'completed');

  // Get previous month bookings
  const { data: previousBookings } = await supabase
    .from('bookings')
    .select('*, services(min_price_cents, max_price_cents)')
    .gte('created_at', previousMonthStart.toISOString())
    .lt('created_at', currentMonthStart.toISOString())
    .eq('status', 'completed');

  // Calculate revenue (using average of min/max price)
  const currentRevenue = currentBookings?.reduce((sum, booking) => {
    const services = booking.services as any;
    const avgPrice = ((services?.min_price_cents || 0) + (services?.max_price_cents || 0)) / 2;
    return sum + (avgPrice / 100); // Convert cents to dollars
  }, 0) || 0;

  const previousRevenue = previousBookings?.reduce((sum, booking) => {
    const services = booking.services as any;
    const avgPrice = ((services?.min_price_cents || 0) + (services?.max_price_cents || 0)) / 2;
    return sum + (avgPrice / 100);
  }, 0) || 0;

  // Get total customers (unique users with bookings)
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('user_id');

  const uniqueCustomers = new Set(allBookings?.map(b => b.user_id) || []).size;

  // Get previous month customers
  const { data: prevMonthBookings } = await supabase
    .from('bookings')
    .select('user_id')
    .gte('created_at', previousMonthStart.toISOString())
    .lt('created_at', currentMonthStart.toISOString());

  const prevUniqueCustomers = new Set(prevMonthBookings?.map(b => b.user_id) || []).size;

  // Get active services
  const { data: services } = await supabase
    .from('services')
    .select('id')
    .eq('status', 'published');

  const activeServices = services?.length || 0;

  // Calculate percentage changes
  const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const bookingsChange = (previousBookings?.length || 0) > 0 ? 
    (((currentBookings?.length || 0) - (previousBookings?.length || 0)) / (previousBookings?.length || 0)) * 100 : 0;
  const customersChange = prevUniqueCustomers > 0 ? 
    ((uniqueCustomers - prevUniqueCustomers) / prevUniqueCustomers) * 100 : 0;

  return {
    totalRevenue: currentRevenue,
    revenueChange,
    totalBookings: currentBookings?.length || 0,
    bookingsChange,
    totalCustomers: uniqueCustomers,
    customersChange,
    activeServices,
    servicesChange: 0, // Services don't change frequently, so we'll keep this at 0
  };
}

export async function getRecentBookings(): Promise<RecentBooking[]> {
  const supabase = await createClient();
  
  try {
    const { data: bookings } = await supabase.rpc('get_recent_bookings_with_customer_info');

    if (bookings) {
      return bookings.map((booking: any) => ({
        id: booking.id.slice(0, 8).toUpperCase(),
        customer: booking.customer_name || 'Unknown Customer',
        email: booking.customer_email || 'unknown@example.com',
        service: booking.service_name || 'Unknown Service',
        date: new Date(booking.starts_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        status: booking.status,
        amount: `$${((booking.min_price_cents || 0) / 100).toFixed(2)}`,
      }));
    }
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
  }

  // Fallback to empty array if RPC fails
  return [];
}

export async function getPopularServices(): Promise<PopularService[]> {
  const supabase = await createClient();
  
  const { data: serviceStats } = await supabase
    .from('bookings')
    .select(`
      service_id,
      services(name, min_price_cents, max_price_cents),
      branches(name)
    `)
    .eq('status', 'completed')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

  if (!serviceStats) return [];

  // Group by service and calculate revenue
  const serviceRevenue: Record<string, { name: string; clinic: string; totalRevenue: number; initials: string }> = {};
  
  serviceStats.forEach(booking => {
    const serviceId = booking.service_id;
    const serviceName = (booking.services as any)?.name || 'Unknown';
    const branchName = (booking.branches as any)?.name || 'Unknown Branch';
    const revenue = (((booking.services as any)?.min_price_cents || 0) + ((booking.services as any)?.max_price_cents || 0)) / 2 / 100;
    
    if (!serviceRevenue[serviceId]) {
      serviceRevenue[serviceId] = {
        name: serviceName,
        clinic: branchName,
        totalRevenue: 0,
        initials: serviceName.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase(),
      };
    }
    
    serviceRevenue[serviceId].totalRevenue += revenue;
  });

  // Sort by revenue and take top 5
  return Object.values(serviceRevenue)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
    .map(service => ({
      name: service.name,
      clinic: service.clinic,
      revenue: `+$${service.totalRevenue.toFixed(2)}`,
      initials: service.initials,
    }));
}

export async function getChartData(): Promise<ChartDataPoint[]> {
  const supabase = await createClient();
  
  // Get last 7 months of data
  const months = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      name: date.toLocaleDateString('en-US', { month: 'short' }),
    });
  }

  const chartData: ChartDataPoint[] = [];

  for (const month of months) {
    const { data: monthBookings } = await supabase
      .from('bookings')
      .select('*, services(min_price_cents, max_price_cents)')
      .gte('created_at', month.start.toISOString())
      .lte('created_at', month.end.toISOString())
      .eq('status', 'completed');

    const revenue = monthBookings?.reduce((sum, booking) => {
      const services = booking.services as any;
      const avgPrice = ((services?.min_price_cents || 0) + (services?.max_price_cents || 0)) / 2;
      return sum + (avgPrice / 100);
    }, 0) || 0;

    chartData.push({
      month: month.name,
      revenue: Math.round(revenue),
      bookings: monthBookings?.length || 0,
    });
  }

  return chartData;
}