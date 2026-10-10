import { createClient } from '@/lib/supabase/client';

export async function updateEnquiryStatus(id: string, status: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('contact_enquiries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function assignEnquiry(id: string, assigneeId: string | null) {
  const supabase = createClient();
  const { error } = await supabase
    .from('contact_enquiries')
    .update({ assigned_to: assigneeId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function addEnquiryNote(id: string, note: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('contact_enquiries')
    .update({ admin_notes: note, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markEnquiryFollowUpSent(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('contact_enquiries')
    .update({
      follow_up_sent: true,
      follow_up_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
