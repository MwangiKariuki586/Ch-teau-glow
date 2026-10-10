import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const editSchema = z.object({
  issue_type: z.string().min(1).optional(),
  description: z.string().min(10).max(2000).optional(),
  service_name: z.string().max(200).nullable().optional(),
  branch_name: z.string().max(200).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/complaints/:id — customer edits their own open complaint ────────
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership and that the case is still editable
    const { data: existing, error: fetchError } = await supabase
      .from('recovery_cases')
      .select('id, status, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    if (!['open', 'in_progress'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'This complaint can no longer be edited.' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload.', issues: parsed.error.issues }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('recovery_cases')
      .update({ ...parsed.data })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, case_number, issue_type, issue_description, status, severity, priority, service_name, branch_name, created_at, updated_at, resolved_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update complaint.', detail: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Complaint PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// ── DELETE /api/complaints/:id — customer withdraws their own open complaint ──
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;

    const { data: existing, error: fetchError } = await supabase
      .from('recovery_cases')
      .select('id, status, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    // Only allow withdrawal if not yet escalated/resolved/closed
    if (['escalated', 'resolved', 'closed'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'This complaint cannot be withdrawn at this stage.' },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from('recovery_cases')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to withdraw complaint.', detail: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complaint DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
