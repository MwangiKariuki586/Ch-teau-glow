import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { SupportCenter } from '@/features/admin/support';
import type { AdminUser, Consultation, ContactEnquiry, FollowUpBooking, NewsletterSubscription } from '@/features/admin/support';

export const dynamic = 'force-dynamic';

async function getSupportData() {
  const supabase = await createServiceRoleClient('admin_support_read');

  // ── Contact enquiries ─────────────────────────────────────────────────────
  const { data: enquiries, error: enquiriesError } = await supabase
    .from('contact_enquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (enquiriesError) {
    console.error('[support] contact_enquiries query failed:', enquiriesError.message);
  }

  // ── Newsletter subscriptions ──────────────────────────────────────────────
  // Order by `id` so we never break if created_at doesn't exist on this table
  const { data: newsletters, error: newsletterError } = await supabase
    .from('newsletter_subscriptions')
    .select('id, email, status, source, created_at, updated_at');

  console.log('[support] newsletter query result:', { count: newsletters?.length, error: newsletterError?.message, data: newsletters });

  if (newsletterError) {
    console.error('[support] newsletter_subscriptions query failed:', newsletterError.message);
  }

  // Sort client-side by created_at when available, otherwise by id
  const sortedNewsletters = (newsletters ?? []).sort((a: any, b: any) => {
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return String(b.id).localeCompare(String(a.id));
  });

  // ── Follow-up bookings ────────────────────────────────────────────────────
  // Fetch follow-up bookings without complex joins — enrich with user data separately
  const { data: followUpRows, error: followUpError } = await supabase
    .from('bookings')
    .select(
      'id, user_id, starts_at, ends_at, status, ' +
      'services(name), branches(name), ' +
      'follow_up, follow_up_status, follow_up_due_date, follow_up_assigned_to, follow_up_notes, created_at'
    )
    .eq('follow_up', true)
    .order('follow_up_due_date', { ascending: true, nullsFirst: false });

  if (followUpError) {
    console.error('[support] follow-up bookings query failed:', followUpError.message);
  }

  // Fetch user profile info for the follow-up bookings (if any)
  const userIds = [...new Set((followUpRows ?? []).map((b: any) => b.user_id).filter(Boolean))];

  let profileMap: Record<string, { name: string; email: string; phone: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, email, phone')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('[support] user_profiles query failed:', profilesError.message);
    }

    profileMap = Object.fromEntries(
      (profiles ?? []).map((p: any) => [
        p.user_id,
        {
          name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email,
          email: p.email,
          phone: p.phone ?? null,
        },
      ])
    );
  }

  const normalizedFollowUps: FollowUpBooking[] = (followUpRows ?? []).map((b: any) => {
    const profile = profileMap[b.user_id] ?? null;
    return {
      id: b.id,
      booking_number: null, // column does not exist; use id as ref in UI
      booking_time: b.starts_at ?? null,
      status: b.status,
      service_name: (b.services as any)?.name ?? null,
      venue_name: (b.branches as any)?.name ?? null,
      follow_up: b.follow_up,
      follow_up_status: b.follow_up_status ?? 'pending',
      follow_up_due_date: b.follow_up_due_date ?? null,
      follow_up_assigned_to: b.follow_up_assigned_to ?? null,
      follow_up_notes: b.follow_up_notes ?? null,
      created_at: b.created_at,
      customer_name: profile?.name ?? null,
      customer_email: profile?.email ?? null,
      customer_phone: profile?.phone ?? null,
    };
  });

  // ── Admin users (for assign-to dropdowns) ─────────────────────────────────
  const { data: adminProfiles, error: adminError } = await supabase
    .from('user_profiles')
    .select('id, user_id, email, first_name, last_name')
    .eq('role', 'admin')
    .eq('is_active', true);

  if (adminError) {
    console.error('[support] admin user_profiles query failed:', adminError.message);
  }

  // ── Consultations ─────────────────────────────────────────────────────────
  const { data: consultationRows, error: consultationsError } = await supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false });

  if (consultationsError) {
    console.error('[support] consultations query failed:', consultationsError.message);
  }

  return {
    enquiries: (enquiries ?? []) as ContactEnquiry[],
    newsletters: sortedNewsletters as NewsletterSubscription[],
    followUps: normalizedFollowUps,
    admins: (adminProfiles ?? []) as AdminUser[],
    consultations: (consultationRows ?? []) as Consultation[],
  };
}

export default async function SupportPage() {
  const data = await getSupportData();
  console.log('[support] newsletters count:', data.newsletters.length);

  return (
    <SupportCenter
      enquiries={data.enquiries}
      newsletters={data.newsletters}
      followUps={data.followUps}
      admins={data.admins}
      consultations={data.consultations}
    />
  );
}
