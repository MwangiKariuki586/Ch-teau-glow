import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;

  const branch_id = request.nextUrl.searchParams.get("branch_id");
  const item_type = request.nextUrl.searchParams.get("item_type");

  let query = supabase
    .from("branch_inventory")
    .select(
      "branch_id, inventory_item_id, on_hand, low_stock_threshold, branches(id,name,city), inventory_items(id,name,sku,unit,item_type,is_active)",
    )
    .filter("on_hand", "lte", "low_stock_threshold");

  if (branch_id) query = query.eq("branch_id", branch_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let rows = (data ?? []).map((row) => ({
    branch_id: row.branch_id,
    inventory_item_id: row.inventory_item_id,
    on_hand: Number(row.on_hand),
    low_stock_threshold: Number(row.low_stock_threshold),
    branch: Array.isArray(row.branches) ? row.branches[0] : row.branches,
    item: Array.isArray(row.inventory_items) ? row.inventory_items[0] : row.inventory_items,
    severity: Number(row.on_hand) === 0 ? "out_of_stock" : "low_stock",
  }));

  // Filter by item_type if requested
  if (item_type && item_type !== "all") {
    rows = rows.filter((r) => r.item?.item_type === item_type);
  }

  // Filter out inactive items
  rows = rows.filter((r) => r.item?.is_active !== false);

  // Sort: out_of_stock first, then by coverage ratio ascending
  rows.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "out_of_stock" ? -1 : 1;
    const coverageA = a.low_stock_threshold > 0 ? a.on_hand / a.low_stock_threshold : 0;
    const coverageB = b.low_stock_threshold > 0 ? b.on_hand / b.low_stock_threshold : 0;
    return coverageA - coverageB;
  });

  return NextResponse.json({ data: rows, total: rows.length });
}
