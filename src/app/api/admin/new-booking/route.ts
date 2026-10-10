import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addMinutes, parseISO } from 'date-fns';
import { getAdminSession } from '@/lib/supabase/admin';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const schema = z.object({
  // Client — either existing user_id or guest details
  user_id: z.string().uuid().optional(),
  guest_name: z.string().min(2),
  guest_email: z.string().email(),
  guest_phone: z.string().min(7),
  // Appointment
  service_id: z.string().uuid(),
  specialist_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request', issues: body.error.issues }, { status: 400 });
  }

  const { user_id, guest_name, guest_email, guest_phone, service_id, specialist_id, branch_id, starts_at, notes } = body.data;

  const supabase = await createServiceRoleClient('admin_walk_in');

  // Get service duration
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', service_id)
    .single();

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 400 });
  }

  const slotStart = parseISO(starts_at);
  const slotEnd = addMinutes(slotStart, Number(service.duration_minutes));

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      user_id: user_id ?? null,
      guest_name,
      guest_email,
      guest_phone,
      service_id,
      specialist_id,
      branch_id,
      starts_at: slotStart.toISOString(),
      ends_at: slotEnd.toISOString(),
      status: 'confirmed',
      booking_channel: 'admin',
      notes: notes || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Admin booking error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: booking.id }, { status: 201 });
}
