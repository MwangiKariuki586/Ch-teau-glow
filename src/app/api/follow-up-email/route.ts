import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createTransporter, FROM_ADDRESS } from '@/lib/email';

/** Number of days after a booking's `starts_at` before a follow-up is sent. */
const FOLLOW_UP_DAYS = 14; // 2 weeks

/**
 * GET /api/follow-up-email
 *
 * Finds all bookings that:
 *   - have `follow_up = true`
 *   - have `follow_up_status = 'pending'`
 *   - have a `follow_up_due_date` that is in the past (i.e. the follow-up window has elapsed)
 *     OR — if `follow_up_due_date` is null — the booking's `starts_at` was more than
 *     FOLLOW_UP_DAYS (14) days ago
 *
 * For each matching booking it:
 *   1. Sends a follow-up email to the customer.
 *   2. Updates `follow_up_status` to `'contacted'` and sets `completed_at` to now.
 *
 * Security: callers must supply the correct `Authorization: Bearer <CRON_SECRET>` header.
 * Set CRON_SECRET in your .env to any strong random string.
 *
 * This endpoint is designed to be called by:
 *   - A Vercel Cron Job (vercel.json `crons` config)
 *   - A Supabase Edge Function on a schedule
 *   - A manual trigger from the admin UI
 */
export async function GET(request: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ── Find due follow-ups ─────────────────────────────────────────────────────
  const supabase = await createServiceRoleClient('follow_up_email_dispatch');
  const now = new Date().toISOString();
  const twoWeeksAgo = new Date(Date.now() - FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select(
      'id, user_id, starts_at, ' +
      'services(name), branches(name), ' +
      'follow_up_due_date, follow_up_status, follow_up_notes'
    )
    .eq('follow_up', true)
    .eq('follow_up_status', 'pending')
    .or(`follow_up_due_date.lte.${now},and(follow_up_due_date.is.null,starts_at.lte.${twoWeeksAgo})`);

  if (fetchError) {
    console.error('[follow-up-email] Failed to fetch bookings:', fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No pending follow-ups due.' });
  }

  // Fetch customer profiles for matched bookings
  const userIds = [...new Set(bookings.map((b: any) => b.user_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name, email')
    .in('user_id', userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: any) => [
      p.user_id,
      {
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email,
        email: p.email as string,
      },
    ])
  );

  // ── Send emails ─────────────────────────────────────────────────────────────
  let transporter: ReturnType<typeof createTransporter>;
  try {
    transporter = createTransporter();
  } catch (err: any) {
    console.error('[follow-up-email] Email transporter not configured:', err.message);
    return NextResponse.json(
      { error: 'Email is not configured on this server. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS.' },
      { status: 503 }
    );
  }

  const results: { bookingId: string; email: string; success: boolean; error?: string }[] = [];

  for (const booking of bookings as any[]) {
    const profile = profileMap[booking.user_id];
    if (!profile?.email) {
      results.push({ bookingId: booking.id, email: '(unknown)', success: false, error: 'No email on record' });
      continue;
    }

    const customerName = profile.name || 'Valued Customer';
    const serviceName = (booking.services as any)?.name ?? 'your recent booking';
    const venueName = (booking.branches as any)?.name ? ` at ${(booking.branches as any).name}` : '';
    const bookingRef = `#${booking.id.slice(0, 8)}`;
    const bookingDate = booking.starts_at
      ? new Date(booking.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'your recent appointment';

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>How was your experience?</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#18181b 0%,#3f3f46 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Château Glow</h1>
              <p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">Your Premium Booking Experience</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:15px;color:#71717a;">Hi ${customerName},</p>
              <h2 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;">
                How was your experience with us?
              </h2>
              <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
                It's been a little while since your booking 
                (<strong>${bookingRef}</strong>) for <strong>${serviceName}</strong>${venueName}
                on <strong>${bookingDate}</strong>. We hope everything went smoothly!
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#52525b;line-height:1.6;">
                We'd love to hear about your experience. Your feedback helps us serve you better,
                and we're always here if you need anything else.
              </p>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:8px;background:#18181b;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://browz.com'}/contact"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Share Your Feedback
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:#71717a;line-height:1.6;">
                If you'd like to book again or have any questions, 
                <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://browz.com'}" style="color:#18181b;font-weight:600;">visit our website</a>
                or reply directly to this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:24px 40px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                You're receiving this because you made a booking with Château Glow.<br/>
                &copy; ${new Date().getFullYear()} Château Glow. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const textBody =
      `Hi ${customerName},\n\n` +
      `We hope everything went well with your booking (${bookingRef}) for ${serviceName}${venueName} on ${bookingDate}.\n\n` +
      `We'd love to hear your feedback. You can reach us at ${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://browz.com'}/contact\n\n` +
      `Thank you for choosing Château Glow!\n\nThe Château Glow Team`;

    try {
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: profile.email,
        subject: `How was your experience, ${customerName.split(' ')[0]}? 👋`,
        text: textBody,
        html: htmlBody,
      });

      // Mark as contacted
      await supabase
        .from('bookings')
        .update({
          follow_up_status: 'contacted',
          completed_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      results.push({ bookingId: booking.id, email: profile.email, success: true });
    } catch (sendErr: any) {
      console.error(`[follow-up-email] Failed to send to ${profile.email}:`, sendErr.message);
      results.push({ bookingId: booking.id, email: profile.email, success: false, error: sendErr.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`[follow-up-email] Sent ${successCount}/${results.length} follow-up emails.`);

  return NextResponse.json({
    sent: successCount,
    total: results.length,
    results,
  });
}
