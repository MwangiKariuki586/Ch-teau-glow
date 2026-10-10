import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Returns the lists needed to populate the complaint form dropdowns.
// Auth required — customers only see published services and active branches.
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const [servicesResult, branchesResult] = await Promise.all([
      supabase
        .from('services')
        .select('id, name')
        .eq('status', 'published')
        .order('name', { ascending: true }),
      supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ]);

    return NextResponse.json({
      services: (servicesResult.data ?? []).map((s) => ({ id: s.id, name: s.name })),
      branches: (branchesResult.data ?? []).map((b) => ({ id: b.id, name: b.name })),
    });
  } catch (error) {
    console.error('Complaint options error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
