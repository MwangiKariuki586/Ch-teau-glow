import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source = 'footer' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Use service role to bypass RLS
    const supabase = await createServiceRoleClient('newsletter_subscription_write');

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscriptions')
      .select('id, status')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed!",
          action: 'already_subscribed',
        });
      }

      // Re-activate unsubscribed email
      await supabase
        .from('newsletter_subscriptions')
        .update({ status: 'active', source, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      return NextResponse.json({
        success: true,
        message: "Welcome back! You've been re-subscribed.",
        action: 'reactivated',
      });
    }

    // New subscriber
    const { error } = await supabase.from('newsletter_subscriptions').insert([
      {
        email: normalizedEmail,
        source,
        status: 'active',
      },
    ]);

    if (error) {
      console.error('Error inserting newsletter subscriber:', error);
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You've successfully subscribed to our newsletter!",
      action: 'subscribed',
    });
  } catch (err) {
    console.error('Unexpected error in newsletter route:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
