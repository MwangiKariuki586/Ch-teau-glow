import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";
import { inventoryNotifications } from "@/lib/notifications/inventory";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { userId } = session.data;
  const { id } = await params;

  const supabase = await createServiceRoleClient("admin_inventory_write");

  const { data: recon, error: reconErr } = await supabase
    .from("inventory_reconciliations")
    .select("*, inventory_reconciliation_lines(inventory_item_id, system_qty, counted_qty, delta_qty)")
    .eq("id", id)
    .single();

  if (reconErr || !recon) return NextResponse.json({ error: "Reconciliation not found." }, { status: 404 });
  if (recon.status !== "draft") {
    return NextResponse.json(
      { error: `Reconciliation is already ${recon.status}.` },
      { status: 422 },
    );
  }

  const lines = recon.inventory_reconciliation_lines as {
    inventory_item_id: string;
    system_qty: number;
    counted_qty: number;
    delta_qty: number;
  }[];
  const stockTransitions: Array<{
    branchId: string;
    inventoryItemId: string;
    previousOnHand: number;
    currentOnHand: number;
  }> = [];

  // Apply each line with a non-zero delta
  for (const line of lines) {
    const delta = Number(line.delta_qty);
    if (delta === 0) continue;

    // Update on_hand
    const { data: bi } = await supabase
      .from("branch_inventory")
      .select("on_hand")
      .eq("branch_id", recon.branch_id)
      .eq("inventory_item_id", line.inventory_item_id)
      .single();

    const newOnHand = Number(bi?.on_hand ?? 0) + delta;
    if (newOnHand < 0) {
      return NextResponse.json(
        { error: `Applying reconciliation would result in negative stock for item ${line.inventory_item_id}.` },
        { status: 422 },
      );
    }
    stockTransitions.push({
      branchId: recon.branch_id,
      inventoryItemId: line.inventory_item_id,
      previousOnHand: Number(bi?.on_hand ?? 0),
      currentOnHand: newOnHand,
    });

    await supabase
      .from("branch_inventory")
      .upsert(
        { branch_id: recon.branch_id, inventory_item_id: line.inventory_item_id, on_hand: newOnHand, low_stock_threshold: 0 },
        { onConflict: "branch_id,inventory_item_id" },
      );

    await supabase.from("inventory_movements").insert({
      movement_type: "reconciliation",
      branch_id: recon.branch_id,
      inventory_item_id: line.inventory_item_id,
      quantity_delta: delta,
      reason_code: "cycle_count",
      reference_type: "inventory_reconciliation",
      reference_id: id,
      actor_user_id: userId,
    });
  }

  // Mark reconciliation as applied
  const { data: updated, error: updateErr } = await supabase
    .from("inventory_reconciliations")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  await inventoryNotifications.notifyReconciliationApplied({
    supabase,
    reconciliationId: id,
    actorUserId: userId,
  });
  await inventoryNotifications.notifyStockTransitions({
    supabase,
    actorUserId: userId,
    transitions: stockTransitions,
  });

  return NextResponse.json({ data: updated });
}
