import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/supabase/admin';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createServiceRoleClient('admin_walk_in');
  const like = `%${q}%`;

  // Search user_profiles (registered users)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name, email, phone')
    .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(10);

  // Search walk_ins (physical walk-in records)
  const { data: walkIns } = await supabase
    .from('walk_ins')
    .select('id, full_name, email, phone')
    .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(10);

  // Search bookings guest fields (guest bookings without account)
  const { data: guestBookings } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_email, guest_phone')
    .not('guest_name', 'is', null)
    .or(`guest_name.ilike.${like},guest_email.ilike.${like},guest_phone.ilike.${like}`)
    .limit(10);

  type ClientResult = {
    source: 'registered' | 'walk_in' | 'guest';
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    user_id?: string;
  };

  const results: ClientResult[] = [
    ...(profiles ?? []).map((p) => ({
      source: 'registered' as const,
      id: p.user_id,
      user_id: p.user_id,
      full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
      email: p.email,
      phone: p.phone,
    })),
    ...(walkIns ?? []).map((w) => ({
      source: 'walk_in' as const,
      id: w.id,
      full_name: w.full_name,
      email: w.email,
      phone: w.phone,
    })),
    ...(guestBookings ?? [])
      .filter((g) => g.guest_name)
      .map((g) => ({
        source: 'guest' as const,
        id: g.id,
        full_name: g.guest_name!,
        email: g.guest_email,
        phone: g.guest_phone,
      })),
  ];

  // Deduplicate by email
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = r.email ?? r.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ results: deduped });
}
