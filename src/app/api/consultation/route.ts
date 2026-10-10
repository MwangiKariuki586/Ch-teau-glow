import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone_number,
      service_type,
      preferred_date,
      preferred_time,
      concerns_or_goals,
    } = body;

    // Basic validation
    if (!first_name || !last_name || !email || !phone_number || !service_type || !preferred_date || !preferred_time) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, email, phone_number, service_type, preferred_date, and preferred_time are required.' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS — this key never leaves the server
    const supabase = await createServiceRoleClient('consultation_submission_write');

    const { data, error } = await supabase
      .from('consultations')
      .insert([
        {
          first_name,
          last_name,
          email,
          phone_number,
          service_type,
          preferred_date,
          preferred_time,
          concerns_or_goals: concerns_or_goals || null,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting consultation:', error);
      return NextResponse.json(
        { error: 'Failed to submit consultation. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in consultation route:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
