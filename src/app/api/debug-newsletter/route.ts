import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { NewsletterSubscription } from '@/features/admin/support';

// Replicates exactly what page.tsx getSupportData does for newsletters
export async function GET() {
  const supabase = await createServiceRoleClient('admin_support_read');

  // Exact same query as page.tsx
  const { data: newsletters, error: newsletterError } = await supabase
    .from('newsletter_subscriptions')
    .select('id, email, status, source, created_at, updated_at');

  // Exact same sort as page.tsx
  const sortedNewsletters = (newsletters as NewsletterSubscription[] ?? []).sort((a, b) => {
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return String(b.id).localeCompare(String(a.id));
  });

  // Also test enquiries for comparison
  const { data: enquiries, error: enquiriesError } = await supabase
    .from('contact_enquiries')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    newsletters: {
      data: sortedNewsletters,
      error: newsletterError?.message ?? null,
      count: sortedNewsletters.length,
    },
    enquiries: {
      error: enquiriesError?.message ?? null,
      count: enquiries?.length ?? 0,
    },
  });
}
