import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET() {
  try {
    const supabase = await createServiceRoleClient('consultation_submission_write');

    // Fetch published services that belong to the 'consultations' category.
    // The category and its services are seeded via supabase/seed.sql.
    const { data, error } = await supabase
      .from('services')
      .select('id, name, duration_minutes, description')
      .eq('status', 'published')
      .filter(
        'category_id',
        'in',
        `(select id from service_categories where slug = 'consultations')`
      )
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching consultation services:', error);
      return NextResponse.json(
        { error: 'Failed to load consultation services.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in consultation services route:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
