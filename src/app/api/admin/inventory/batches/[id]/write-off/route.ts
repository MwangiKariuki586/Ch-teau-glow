import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";
import { inventoryNotifications } from "@/lib/notifications/inventory";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { userId } = session.data;

  const { id: batchId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchId)) {
    return NextResponse.json({ error: "Invalid batch ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const supabase = await createServiceRoleClient("admin_inventory_write");

  // Fetch the batch
  const { data: batch, error: fetchError } = await supabase
    .from("inventory_batches")
    .select("id, inventory_item_id, branch_id, quantity, lot_number")
    .eq("id", batchId)
    .single();

  if (fetchError || !batch) {
    return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  }

  if (batch.quantity <= 0) {
    return NextResponse.json({ error: "Batch is already empty." }, { status: 422 });
  }

  const writtenOffQty = batch.quantity;

  // Zero out the batch
  const { error: updateError } = await supabase
    .from("inventory_batches")
    .update({ quantity: 0, updated_at: new Date().toISOString() })
    .eq("id", batchId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // Decrement branch_inventory.on_hand
  const { data: bi } = await supabase
    .from("branch_inventory")
    .select("on_hand")
    .eq("branch_id", batch.branch_id)
    .eq("inventory_item_id", batch.inventory_item_id)
    .single();

  const newOnHand = Math.max(0, Number(bi?.on_hand ?? 0) - writtenOffQty);

  await supabase
    .from("branch_inventory")
    .update({ on_hand: newOnHand, updated_at: new Date().toISOString() })
    .eq("branch_id", batch.branch_id)
    .eq("inventory_item_id", batch.inventory_item_id);

  // Write reconciliation movement
  await supabase.from("inventory_movements").insert({
    movement_type: "reconciliation",
    branch_id: batch.branch_id,
    inventory_item_id: batch.inventory_item_id,
    quantity_delta: -writtenOffQty,
    batch_id: batchId,
    reference_type: "batch_write_off",
    reference_id: batchId,
    actor_user_id: userId,
    reason_code: "expiry",
    notes: parsed.data.notes ?? `Write-off: batch ${batch.lot_number ?? batchId}`,
  });

  await inventoryNotifications.notifyExpiryWriteOffCompleted({
    supabase,
    batchId,
    actorUserId: userId,
  });
  await inventoryNotifications.notifyStockTransitions({
    supabase,
    actorUserId: userId,
    transitions: [
      {
        branchId: batch.branch_id,
        inventoryItemId: batch.inventory_item_id,
        previousOnHand: Number(bi?.on_hand ?? 0),
        currentOnHand: newOnHand,
      },
    ],
  });

  return NextResponse.json({
    data: {
      batch_id: batchId,
      written_off_qty: writtenOffQty,
      new_on_hand: newOnHand,
    },
  });
}
