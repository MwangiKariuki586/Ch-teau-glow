'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteBranch(branchId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Block deletion if branch has active/pending/confirmed bookings
  const { count, error: checkError } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .in('status', ['pending', 'confirmed', 'rescheduled']);

  if (checkError) return { error: 'Failed to check branch bookings.' };
  if (count && count > 0) {
    return {
      error: `Cannot delete branch: ${count} active booking${count > 1 ? 's' : ''} exist. Cancel or reassign them first.`,
    };
  }

  const { error } = await supabase.from('branches').delete().eq('id', branchId);
  if (error) return { error: error.message };

  revalidatePath('/admin/branches');
  return {};
}
