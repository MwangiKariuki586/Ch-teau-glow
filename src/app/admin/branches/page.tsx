import { createClient } from '@/lib/supabase/server';
import { BranchesList } from '@/features/admin/branches';

async function getBranches() {
  const supabase = await createClient();
  const { data: branches, error } = await supabase
    .from('branches')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching branches:', error);
    return [];
  }

  return branches || [];
}

export default async function BranchesPage() {
  const branches = await getBranches();

  return <BranchesList branches={branches} />;
}
