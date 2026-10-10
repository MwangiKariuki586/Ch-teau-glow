import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/supabase/admin';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });

  const resolvedParams = await params;
  const parsedParams = paramsSchema.safeParse(resolvedParams);
  if (!parsedParams.success) return NextResponse.json({ error: 'Invalid specialist ID' }, { status: 400 });

  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  if (!parsedQuery.success) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });

  const specialistId = parsedParams.data.id;
  const { date_from, date_to } = parsedQuery.data;
  const supabase = await createServiceRoleClient('admin_schedule_read');

  // Fetch specialist availability config
  const { data: specialist, error: specError } = await supabase
    .from('specialists')
    .select('id, name, title, image_url, availability, branch_id')
    .eq('id', specialistId)
    .maybeSingle();

  if (specError || !specialist) {
    return NextResponse.json({ error: 'Specialist not found' }, { status: 404 });
  }

  // Fetch bookings in range with user profiles
  const rangeStart = `${date_from}T00:00:00`;
  const rangeEnd = `${date_to}T23:59:59`;

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id, starts_at, ends_at, status, notes, user_id, guest_name, guest_email, guest_phone,
      payment_status, booking_channel, created_at,
      service:services(id, name, duration_minutes),
      branch:branches(id, name, city)
    `)
    .eq('specialist_id', specialistId)
    .gte('starts_at', rangeStart)
    .lte('starts_at', rangeEnd)
    .in('status', ['pending', 'confirmed', 'rescheduled', 'completed'])
    .order('starts_at', { ascending: true });

  if (bookingsError) return NextResponse.json({ error: bookingsError.message }, { status: 500 });

  // Resolve customer names from user_profiles
  const userIds = [...new Set((bookings ?? []).map(b => b.user_id).filter(Boolean))];
  let profileMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, email')
      .in('user_id', userIds);

    (profiles ?? []).forEach(p => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email?.split('@')[0] || 'Customer';
      profileMap[p.user_id] = name;
    });
  }

  const enrichedBookings = (bookings ?? []).map(b => {
    const svc = Array.isArray(b.service) ? b.service[0] : b.service;
    const branch = Array.isArray(b.branch) ? b.branch[0] : b.branch;
    return {
      id: b.id,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      status: b.status,
      notes: b.notes,
      customer_name: profileMap[b.user_id] || b.guest_name || 'Guest',
      customer_email: b.guest_email || null,
      customer_phone: b.guest_phone || null,
      service_name: svc?.name ?? 'Service',
      service_id: svc?.id ?? null,
      duration_minutes: svc?.duration_minutes ?? 60,
      branch_name: branch?.name ?? null,
      payment_status: b.payment_status ?? null,
      booking_channel: b.booking_channel ?? null,
      created_at: b.created_at ?? null,
    };
  });

  return NextResponse.json({
    specialist: {
      id: specialist.id,
      name: specialist.name,
      title: specialist.title,
      image_url: specialist.image_url,
      availability: specialist.availability,
      branch_id: specialist.branch_id,
    },
    bookings: enrichedBookings,
  });
}
