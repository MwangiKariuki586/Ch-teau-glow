import { createClient } from '@/lib/supabase/client';

export async function updateConsultationStatus(id: string, status: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('consultations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
