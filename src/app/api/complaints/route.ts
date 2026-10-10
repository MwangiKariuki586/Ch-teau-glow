import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ISSUE_PRIORITY_MAP } from '@/features/customer/complaints/types';

const submitSchema = z.object({
  issue_type: z.string().min(1),
  description: z.string().min(10, 'Please describe the issue in at least 10 characters.').max(2000),
  booking_id: z.string().uuid().optional().nullable(),
  service_name: z.string().max(200).optional().nullable(),
  branch_name: z.string().max(200).optional().nullable(),
});

// ── POST /api/complaints ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid submission.', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { issue_type, description, booking_id, service_name, branch_name } = parsed.data;

    // Fetch customer name/email — user_profiles stores first_name + last_name separately
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    // Build the best available display name
    const clientName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.email?.split('@')[0] ||
      null;

    // Classify using the shared priority map (same logic the form previews)
    const classification = ISSUE_PRIORITY_MAP[issue_type as keyof typeof ISSUE_PRIORITY_MAP] ?? {
      severity: 'medium',
      priority: 'normal',
      slaHours: 72,
    };

    const slaDeadline = new Date(
      Date.now() + classification.slaHours * 60 * 60 * 1000
    ).toISOString();

    const { data: newCase, error: insertError } = await supabase
      .from('recovery_cases')
      .insert({
        user_id: user.id,
        client_name: clientName,
        client_email: profile?.email ?? user.email ?? null,
        client_phone: profile?.phone ?? null,
        booking_id: booking_id ?? null,
        service_name: service_name ?? null,
        branch_name: branch_name ?? null,
        issue_type,
        issue_description: description,
        severity: classification.severity,
        priority: classification.priority,
        sla_deadline: slaDeadline,
        status: 'open',
        tags: [],
      })
      .select('id, case_number, status, severity, priority, created_at')
      .single();

    if (insertError) {
      console.error('Complaint insert error:', insertError);
      if (insertError.code === '42P01') {
        return NextResponse.json(
          {
            error:
              'The recovery_cases table does not exist yet. Please run the SQL migration in scripts/create-recovery-cases-table.sql in your Supabase dashboard.',
            code: insertError.code,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to submit complaint.', detail: insertError.message, code: insertError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newCase }, { status: 201 });
  } catch (error) {
    console.error('Complaints API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// ── GET /api/complaints — customer fetches their own complaints ───────────────
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('recovery_cases')
      .select(
        'id, case_number, issue_type, issue_description, status, severity, priority, service_name, branch_name, created_at, updated_at, resolved_at, closed_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch complaints.' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Complaints GET error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
