import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase } = session.data;
  const [categoriesResult, branchesResult, specialistsResult] = await Promise.all([
    supabase
      .from("service_categories")
      .select("id,name,slug,is_active,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("branches")
      .select("id,name,city,country,is_active")
      .order("name", { ascending: true }),
    supabase
      .from("specialists")
      .select("id,name,title,is_active")
      .order("name", { ascending: true }),
  ]);

  const error =
    categoriesResult.error || branchesResult.error || specialistsResult.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    data: {
      categories: categoriesResult.data ?? [],
      branches: branchesResult.data ?? [],
      specialists: specialistsResult.data ?? [],
    },
  });
}
