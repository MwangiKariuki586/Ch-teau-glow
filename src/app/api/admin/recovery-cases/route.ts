import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── GET /api/admin/recovery-cases ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const branch = searchParams.get('branch');
    const overdue = searchParams.get('overdue');

    let query = supabase
      .from('recovery_cases')
      .select(`
        *,
        user_profiles!recovery_cases_user_id_fkey(
          first_name, last_name, email, phone
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (severity && severity !== 'all') query = query.eq('severity', severity);
    if (branch && branch !== 'all') query = query.eq('branch_name', branch);
    if (overdue === 'true') query = query.eq('is_overdue', true);

    const { data, error } = await query;

    if (error) {
      // If the join fails (no FK defined), fall back to plain select
      if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
        const { data: plain, error: plainError } = await supabase
          .from('recovery_cases')
          .select('*')
          .order('created_at', { ascending: false });

        if (plainError) {
          console.error('Recovery cases fetch error:', plainError);
          return NextResponse.json({ error: 'Failed to fetch cases.' }, { status: 500 });
        }
        return NextResponse.json({ data: plain ?? [] });
      }

      console.error('Recovery cases fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch cases.' }, { status: 500 });
    }

    // Merge profile name into client_name when the stored value is missing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched = (data ?? []).map((row: any) => {
      if (!row.client_name?.trim()) {
        const p = row.user_profiles;
        row.client_name =
          [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() ||
          p?.email?.split('@')[0] ||
          row.client_email?.split('@')[0] ||
          null;
      }
      if (!row.client_email && row.user_profiles?.email) {
        row.client_email = row.user_profiles.email;
      }
      delete row.user_profiles;
      return row;
    });

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('Admin recovery cases error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
