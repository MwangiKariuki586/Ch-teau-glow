import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getAdminSession } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { searchParams } = request.nextUrl;
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const branchId = searchParams.get('branch_id');
  const specialistId = searchParams.get('specialist_id');

  try {
    const supabase = await createServiceRoleClient('admin_analytics_read');

    // Bookings with joins — include payment_status to accurately compute revenue
    let bookingsQuery = supabase
      .from('bookings')
      .select(
        'id,status,starts_at,created_at,payment_amount_cents,payment_currency,payment_status,service:services(id,name,currency,min_price_cents),branch:branches(id,name)',
      );

    if (dateFrom) bookingsQuery = bookingsQuery.gte('starts_at', dateFrom);
    if (dateTo) bookingsQuery = bookingsQuery.lt('starts_at', dateTo);
    if (branchId) bookingsQuery = bookingsQuery.eq('branch_id', branchId);
    if (specialistId) bookingsQuery = bookingsQuery.eq('specialist_id', specialistId);

    const { data: bookings, error: bookingsError } = await bookingsQuery;
    if (bookingsError) throw bookingsError;

    // Customers count — exclude admin users to match the customers page
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const { data: adminUsers } = await supabase.from('admin_users').select('user_id');
    const adminIds = new Set((adminUsers ?? []).map((a: { user_id: string }) => a.user_id));
    const totalCustomers = (users ?? []).filter((u) => !adminIds.has(u.id)).length;

    // Branches list for filter
    const { data: branches } = await supabase
      .from('branches')
      .select('id,name')
      .eq('is_active', true)
      .order('name');

    // Specialists list for filter
    const { data: specialists } = await supabase
      .from('specialists')
      .select('id,name')
      .eq('is_active', true)
      .order('name');

    // Currency from settings
    const { data: paymentSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'payment_settings')
      .single();

    const currency = (paymentSetting?.value as { currency?: string })?.currency ?? 'USD';

    return NextResponse.json({
      bookings: bookings ?? [],
      totalCustomers,
      branches: branches ?? [],
      specialists: specialists ?? [],
      currency,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
