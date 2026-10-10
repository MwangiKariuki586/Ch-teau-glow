import { createClient } from '@/lib/supabase/client';

/** Default follow-up period in days (2 weeks) */
const FOLLOW_UP_DAYS = 14;

export async function updateFollowUpStatus(
  bookingId: string,
  status: 'pending' | 'contacted' | 'completed'
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('bookings')
    .update({ follow_up_status: status })
    .eq('id', bookingId);
  if (error) throw error;
}

export async function updateFollowUpAssignee(bookingId: string, assigneeId: string | null) {
  const supabase = createClient();
  const { error } = await supabase
    .from('bookings')
    .update({ follow_up_assigned_to: assigneeId })
    .eq('id', bookingId);
  if (error) throw error;
}

export async function updateFollowUpNotes(bookingId: string, notes: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('bookings')
    .update({ follow_up_notes: notes })
    .eq('id', bookingId);
  if (error) throw error;
}

/**
 * Stamps a `follow_up_due_date` on a booking — defaults to `startsAt + FOLLOW_UP_DAYS`.
 * Call this whenever you toggle `follow_up = true` on a booking.
 */
export async function setFollowUpDueDate(bookingId: string, startsAt: string) {
  const supabase = createClient();
  const dueDate = new Date(new Date(startsAt).getTime() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await supabase
    .from('bookings')
    .update({ follow_up_due_date: dueDate.toISOString() })
    .eq('id', bookingId);
  if (error) throw error;
  return dueDate.toISOString();
}

/**
 * Calls the server-side follow-up email endpoint to send emails
 * to all customers whose follow-up is now due.
 * Returns a summary of how many emails were sent.
 */
export async function triggerFollowUpEmails(): Promise<{
  sent: number;
  total: number;
  results: { bookingId: string; email: string; success: boolean; error?: string }[];
}> {
  const res = await fetch('/api/follow-up-email', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}
