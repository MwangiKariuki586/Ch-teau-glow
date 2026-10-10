import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, subject, and message are required.' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS — this key never leaves the server
    const supabase = await createServiceRoleClient('contact_enquiry_write');

    const { data, error } = await supabase
      .from('contact_enquiries')
      .insert([
        {
          name,
          email,
          phone: phone || null,
          subject,
          message,
          status: 'new',
          priority: 'normal',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting contact enquiry:', error);
      return NextResponse.json(
        { error: 'Failed to submit enquiry. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in contact route:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
