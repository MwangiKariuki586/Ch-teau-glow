import { createClient } from '@/lib/supabase/server';
import { SpecialistsPageWrapper } from '@/features/admin/specialists';

async function getSpecialists() {
  const supabase = await createClient();
  const { data: specialists, error } = await supabase
    .from('specialists')
    .select(`
      *,
      branches:branch_id (id, name, city, country),
      specialist_services (service_id, is_active, services (id, name))
    `)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching specialists:', error);
    return [];
  }
  return specialists || [];
}

async function getServices() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('services')
    .select('id, name')
    .eq('status', 'published')
    .order('name', { ascending: true });
  return data || [];
}

export default async function SpecialistsPage() {
  const [specialists, services] = await Promise.all([getSpecialists(), getServices()]);
  return <SpecialistsPageWrapper specialists={specialists} services={services} />;
}
