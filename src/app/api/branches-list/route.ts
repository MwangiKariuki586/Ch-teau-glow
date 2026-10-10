import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, city')
    .eq('is_active', true)
    .order('name');

  if (error) return NextResponse.json({ data: [] });
  return NextResponse.json({ data: data ?? [] });
}
