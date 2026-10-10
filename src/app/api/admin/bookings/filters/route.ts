import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const supabase = await createServiceRoleClient("admin_bookings_read");

  const [branchesRes, specialistsRes, servicesRes] = await Promise.all([
    supabase.from("branches").select("id,name").order("name", { ascending: true }).limit(200),
    supabase.from("specialists").select("id,name").order("name", { ascending: true }).limit(200),
    supabase.from("services").select("id,name").order("name", { ascending: true }).limit(200),
  ]);

  if (branchesRes.error || specialistsRes.error || servicesRes.error) {
    return NextResponse.json(
      {
        error:
          branchesRes.error?.message ??
          specialistsRes.error?.message ??
          servicesRes.error?.message ??
          "Failed to load filter options.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: {
      branches: (branchesRes.data ?? []).map((item) => ({ id: item.id, name: item.name })),
      specialists: (specialistsRes.data ?? []).map((item) => ({ id: item.id, name: item.name })),
      services: (servicesRes.data ?? []).map((item) => ({ id: item.id, name: item.name })),
    },
  });
}
