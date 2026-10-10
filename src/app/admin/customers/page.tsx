import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { CustomersList } from '@/features/admin/customers';

export const dynamic = 'force-dynamic';

async function getCustomers() {
  try {
    // Use service role to access auth.users
    const supabase = await createServiceRoleClient('admin_customers_read');

    // Get all authenticated users from auth.users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    if (!users || users.length === 0) {
      console.log('No users found in auth.users');
      return [];
    }

    console.log(`Found ${users.length} total users`);

    // Get admin user IDs to exclude them (if table exists)
    const { data: adminUsers } = await supabase
      .from('admin_users')
      .select('user_id');

    // Silently handle if admin_users table doesn't exist yet
    const adminUserIds = new Set(
      (adminUsers as Array<{ user_id: string }> | null)?.map((admin) => admin.user_id) || [],
    );
    
    if (adminUserIds.size > 0) {
      console.log(`Found ${adminUserIds.size} admin users to exclude`);
    }

    // Get booking data for each user (if table exists)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('user_id, service_price, status, created_at');

    // Silently handle if bookings table doesn't exist yet

    const userStats = new Map<
      string,
      {
        booking_count: number;
        total_spent: number;
        last_booking: string | null;
        completed_bookings: number;
      }
    >();
    (bookings as Array<{
      user_id: string;
      service_price: string | number | null;
      status: string;
      created_at: string;
    }> | null)?.forEach((booking) => {
      let stats = userStats.get(booking.user_id);
      if (!stats) {
        stats = {
          booking_count: 0,
          total_spent: 0,
          last_booking: null,
          completed_bookings: 0,
        };
        userStats.set(booking.user_id, stats);
      }

      stats.booking_count++;

      if (booking.status === 'completed') {
        stats.completed_bookings++;
        stats.total_spent += Number(booking.service_price ?? 0);
      }

      if (!stats.last_booking || new Date(booking.created_at) > new Date(stats.last_booking)) {
        stats.last_booking = booking.created_at;
      }
    });

    // Filter out admin users and map customer data
    const customers = users
      .filter((user) => !adminUserIds.has(user.id))
      .map((user) => {
        const stats = userStats.get(user.id) || {
          booking_count: 0,
          total_spent: 0,
          last_booking: null,
          completed_bookings: 0,
        };

        return {
          id: user.id,
          email: user.email || 'N/A',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
          email_confirmed_at: user.email_confirmed_at || null,
          phone: user.phone || user.user_metadata?.phone || null,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          booking_count: stats.booking_count,
          completed_bookings: stats.completed_bookings,
          total_spent: stats.total_spent,
          last_booking: stats.last_booking,
          provider: user.app_metadata?.provider || 'email',
        };
      });

    console.log(`Returning ${customers.length} customers`);
    return customers;
  } catch (error) {
    console.error('Error in getCustomers:', error);
    return [];
  }
}

export default async function CustomersPage() {
  const customers = await getCustomers();

  return <CustomersList customers={customers} />;
}
