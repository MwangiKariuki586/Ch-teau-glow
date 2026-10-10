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

  // Load transfer + items
  const { data: transfer, error: tErr } = await supabase
    .from("inventory_transfers")
    .select("*, inventory_transfer_items(inventory_item_id, quantity)")
    .eq("id", id)
    .single();

  if (tErr || !transfer) {
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (transfer.status !== "draft") {
    return NextResponse.json(
      { error: `Transfer is already ${transfer.status}. Only draft transfers can be sent.` },
      { status: 422 },
    );
  }

  const items = transfer.inventory_transfer_items as { inventory_item_id: string; quantity: number }[];
  const stockTransitions: Array<{
    branchId: string;
    inventoryItemId: string;
    previousOnHand: number;
    currentOnHand: number;
  }> = [];

  // Validate stock availability for each item at from_branch
  for (const item of items) {
    const { data: bi } = await supabase
      .from("branch_inventory")
      .select("on_hand")
      .eq("branch_id", transfer.from_branch_id)
      .eq("inventory_item_id", item.inventory_item_id)
      .single();

    const available = Number(bi?.on_hand ?? 0);
    if (available < item.quantity) {
      const { data: inv } = await supabase
        .from("inventory_items")
        .select("name")
        .eq("id", item.inventory_item_id)
        .single();
      return NextResponse.json(
        {
          error: `Insufficient stock for "${inv?.name ?? item.inventory_item_id}". Available: ${available}, requested: ${item.quantity}.`,
        },
        { status: 422 },
      );
    }
  }

  // Deduct from source branch + write transfer_out movements
  for (const item of items) {
    const { data: bi } = await supabase
      .from("branch_inventory")
      .select("on_hand")
      .eq("branch_id", transfer.from_branch_id)
      .eq("inventory_item_id", item.inventory_item_id)
      .single();

    const newOnHand = Number(bi!.on_hand) - item.quantity;
    stockTransitions.push({
      branchId: transfer.from_branch_id,
      inventoryItemId: item.inventory_item_id,
      previousOnHand: Number(bi!.on_hand),
      currentOnHand: newOnHand,
    });

    await supabase
      .from("branch_inventory")
      .update({ on_hand: newOnHand })
      .eq("branch_id", transfer.from_branch_id)
      .eq("inventory_item_id", item.inventory_item_id);

    await supabase.from("inventory_movements").insert({
      movement_type: "transfer_out",
      branch_id: transfer.from_branch_id,
      inventory_item_id: item.inventory_item_id,
      quantity_delta: -item.quantity,
      reason_code: "transfer",
      reference_type: "inventory_transfer",
      reference_id: id,
      actor_user_id: userId,
    });
  }

  // Mark transfer as sent
  const { data: updated, error: updateErr } = await supabase
    .from("inventory_transfers")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  await inventoryNotifications.notifyTransferSent({
    supabase,
    transferId: id,
    actorUserId: userId,
  });
  await inventoryNotifications.notifyStockTransitions({
    supabase,
    actorUserId: userId,
    transitions: stockTransitions,
  });

  return NextResponse.json({ data: updated });
}
