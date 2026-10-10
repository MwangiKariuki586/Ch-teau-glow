import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email(),
  service_id: z.string().uuid(),
  specialist_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Verify admin session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid request', issues: body.error.issues }, { status: 400 });
    }

    const { full_name, phone, email, service_id, specialist_id, branch_id, starts_at, notes } = body.data;

    const serviceClient = await createServiceRoleClient('admin_walk_in');

    // Insert walk-in record
    const { data: walkIn, error: insertError } = await serviceClient
      .from('walk_ins')
      .insert({
        full_name,
        phone,
        email,
        service_id,
        specialist_id,
        branch_id,
        starts_at,
        notes: notes || null,
        registered_by: user.id,
        status: 'waiting',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Walk-in insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ id: walkIn.id }, { status: 201 });
  } catch (err) {
    console.error('Walk-in registration error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
