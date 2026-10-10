import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;

  const reference_type = request.nextUrl.searchParams.get("reference_type");
  const reference_id = request.nextUrl.searchParams.get("reference_id");
  const branch_id = request.nextUrl.searchParams.get("branch_id");
  const inventory_item_id = request.nextUrl.searchParams.get("inventory_item_id");

  let query = supabase
    .from("inventory_movements")
    .select("*, inventory_items(id, name, sku, unit)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (reference_type) query = query.eq("reference_type", reference_type);
  if (reference_id) query = query.eq("reference_id", reference_id);
  if (branch_id) query = query.eq("branch_id", branch_id);
  if (inventory_item_id) query = query.eq("inventory_item_id", inventory_item_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data: data ?? [] });
}
