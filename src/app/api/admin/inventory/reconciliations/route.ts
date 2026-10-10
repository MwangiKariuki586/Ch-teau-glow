import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const createSchema = z.object({
  branch_id: z.string().uuid(),
  inventory_item_id: z.string().uuid().optional().nullable(), // single-item scope
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;

  const branch_id = request.nextUrl.searchParams.get("branch_id");
  const status = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("inventory_reconciliations")
    .select("*, branches(id,name,city), inventory_reconciliation_lines(id, inventory_item_id, system_qty, counted_qty, delta_qty, notes, inventory_items(id,name,sku,unit))")
    .order("created_at", { ascending: false })
    .limit(50);

  if (branch_id) query = query.eq("branch_id", branch_id);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase, userId } = session.data;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { branch_id, inventory_item_id, notes } = parsed.data;

  // Block duplicate drafts for the same branch
  const { data: existing } = await supabase
    .from("inventory_reconciliations")
    .select("id")
    .eq("branch_id", branch_id)
    .eq("status", "draft")
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "A draft reconciliation already exists for this branch. Apply or cancel it before starting a new one.", existing_id: existing.id },
      { status: 409 },
    );
  }

  // Determine which items to include
  let branchItems: { inventory_item_id: string; on_hand: number }[] = [];

  if (inventory_item_id) {
    // Single-item scope
    const { data } = await supabase
      .from("branch_inventory")
      .select("inventory_item_id, on_hand")
      .eq("branch_id", branch_id)
      .eq("inventory_item_id", inventory_item_id)
      .single();
    if (data) branchItems = [{ inventory_item_id: data.inventory_item_id, on_hand: Number(data.on_hand) }];
  } else {
    // Full branch scope
    const { data } = await supabase
      .from("branch_inventory")
      .select("inventory_item_id, on_hand")
      .eq("branch_id", branch_id);
    branchItems = (data ?? []).map((bi) => ({ inventory_item_id: bi.inventory_item_id, on_hand: Number(bi.on_hand) }));
  }

  const { data: recon, error: reconError } = await supabase
    .from("inventory_reconciliations")
    .insert({ branch_id, notes: notes ?? null, created_by: userId, status: "draft" })
    .select()
    .single();

  if (reconError) return NextResponse.json({ error: reconError.message }, { status: 400 });

  if (branchItems.length > 0) {
    const lines = branchItems.map((bi) => ({
      reconciliation_id: recon.id,
      inventory_item_id: bi.inventory_item_id,
      system_qty: bi.on_hand,
      counted_qty: bi.on_hand,
    }));
    await supabase.from("inventory_reconciliation_lines").insert(lines);
  }

  return NextResponse.json({ data: recon }, { status: 201 });
}
