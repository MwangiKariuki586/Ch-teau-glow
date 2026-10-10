import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const patchSchema = z.object({
  status: z.enum(['open', 'in_progress', 'escalated', 'resolved', 'closed']).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assigned_to: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  resolved_at: z.string().optional().nullable(),
  closed_at: z.string().optional().nullable(),
  is_overdue: z.boolean().optional(),
});

// ── PATCH /api/admin/recovery-cases/:id ──────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    // Auto-set timestamps
    if (updates.status === 'resolved' && !updates.resolved_at) {
      updates.resolved_at = new Date().toISOString();
    }
    if (updates.status === 'closed' && !updates.closed_at) {
      updates.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('recovery_cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update case.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Recovery case PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
