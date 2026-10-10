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

  const { data: transfer, error: tErr } = await supabase
    .from("inventory_transfers")
    .select("*, inventory_transfer_items(inventory_item_id, quantity)")
    .eq("id", id)
    .single();

  if (tErr || !transfer) {
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (transfer.status !== "sent") {
    return NextResponse.json(
      { error: `Transfer is ${transfer.status}. Only sent transfers can be received.` },
      { status: 422 },
    );
  }

  const items = transfer.inventory_transfer_items as { inventory_item_id: string; quantity: number }[];

  // Credit destination branch + write transfer_in movements
  for (const item of items) {
    // Upsert branch_inventory row for destination
    await supabase
      .from("branch_inventory")
      .upsert(
        { branch_id: transfer.to_branch_id, inventory_item_id: item.inventory_item_id, on_hand: 0, low_stock_threshold: 0 },
        { onConflict: "branch_id,inventory_item_id", ignoreDuplicates: true },
      );

    const { data: bi } = await supabase
      .from("branch_inventory")
      .select("on_hand")
      .eq("branch_id", transfer.to_branch_id)
      .eq("inventory_item_id", item.inventory_item_id)
      .single();

    const newOnHand = Number(bi!.on_hand) + item.quantity;

    await supabase
      .from("branch_inventory")
      .update({ on_hand: newOnHand })
      .eq("branch_id", transfer.to_branch_id)
      .eq("inventory_item_id", item.inventory_item_id);

    await supabase.from("inventory_movements").insert({
      movement_type: "transfer_in",
      branch_id: transfer.to_branch_id,
      inventory_item_id: item.inventory_item_id,
      quantity_delta: item.quantity,
      reason_code: "transfer",
      reference_type: "inventory_transfer",
      reference_id: id,
      actor_user_id: userId,
    });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("inventory_transfers")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  await inventoryNotifications.notifyTransferReceived({
    supabase,
    transferId: id,
    actorUserId: userId,
  });

  return NextResponse.json({ data: updated });
}
