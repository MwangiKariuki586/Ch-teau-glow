import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/supabase/admin';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branch_id');
  const serviceId = searchParams.get('service_id');
  const specialistId = searchParams.get('specialist_id');

  const supabase = await createServiceRoleClient('admin_walk_in');

  // Always return all active branches
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  // Services: filter by branch via service_branches junction table if branch selected
  let services: { id: string; name: string }[] = [];
  if (branchId) {
    const { data } = await supabase
      .from('service_branches')
      .select('service:services(id, name)')
      .eq('branch_id', branchId)
      .eq('is_active', true);

    const branchServices = (data ?? [])
      .map((r: any) => Array.isArray(r.service) ? r.service[0] : r.service)
      .filter(Boolean)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    // If specialist_id provided, further filter to only services they can perform
    if (specialistId) {
      const { data: ssData } = await supabase
        .from('specialist_services')
        .select('service_id')
        .eq('specialist_id', specialistId)
        .eq('is_active', true);
      const allowedIds = new Set((ssData ?? []).map((r: any) => r.service_id));
      services = branchServices.filter((s: any) => allowedIds.has(s.id));
    } else {
      services = branchServices;
    }
  } else {
    const { data } = await supabase
      .from('services')
      .select('id, name')
      .eq('status', 'published')
      .order('name');
    services = data ?? [];
  }

  // Specialists: filter by branch via specialist_branches junction table
  let specialists: { id: string; name: string }[] = [];
  if (branchId && serviceId) {
    // Get specialists for this branch AND this service
    const { data: branchSpecialistData } = await supabase
      .from('specialist_branches')
      .select('specialist_id')
      .eq('branch_id', branchId)
      .eq('is_active', true);

    const branchSpecialistIds = new Set(
      (branchSpecialistData ?? []).map((r: any) => r.specialist_id)
    );

    const { data: serviceSpecialistData } = await supabase
      .from('specialist_services')
      .select('specialist_id')
      .eq('service_id', serviceId)
      .eq('is_active', true);

    const serviceSpecialistIds = new Set(
      (serviceSpecialistData ?? []).map((r: any) => r.specialist_id)
    );

    // Intersection: specialists assigned to this branch AND providing this service
    const qualifiedIds = [...branchSpecialistIds].filter(id => serviceSpecialistIds.has(id));

    if (qualifiedIds.length > 0) {
      const { data } = await supabase
        .from('specialists')
        .select('id, name')
        .in('id', qualifiedIds)
        .eq('is_active', true)
        .order('name');
      specialists = data ?? [];
    }
  } else if (branchId) {
    // Get all active specialists for this branch via junction table
    const { data: branchSpecialistData } = await supabase
      .from('specialist_branches')
      .select('specialist_id')
      .eq('branch_id', branchId)
      .eq('is_active', true);

    const ids = (branchSpecialistData ?? []).map((r: any) => r.specialist_id);
    if (ids.length > 0) {
      const { data } = await supabase
        .from('specialists')
        .select('id, name')
        .in('id', ids)
        .eq('is_active', true)
        .order('name');
      specialists = data ?? [];
    }
  } else {
    const { data } = await supabase
      .from('specialists')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    specialists = data ?? [];
  }

  return NextResponse.json({ branches: branches ?? [], services, specialists });
}
