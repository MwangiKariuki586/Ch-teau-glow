import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;

  const { data, error } = await supabase
    .from("branches")
    .select("id, name, city, is_active")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data: data ?? [] });
}
