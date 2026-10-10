import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";
import { inventoryNotifications } from "@/lib/notifications/inventory";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const adjustSchema = z.object({
  branch_id: z.string().uuid(),
  inventory_item_id: z.string().uuid(),
  quantity_delta: z.number().refine((n) => n !== 0, { message: "Delta cannot be zero." }),
  reason_code: z.string().min(1).max(100),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { userId } = session.data;

  const body = await request.json().catch(() => null);
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { branch_id, inventory_item_id, quantity_delta, reason_code, notes } = parsed.data;

  // Use service role for transactional writes
  const supabase = await createServiceRoleClient("admin_inventory_write");

  // Ensure branch_inventory row exists (upsert)
  const { error: upsertError } = await supabase
    .from("branch_inventory")
    .upsert(
      { branch_id, inventory_item_id, on_hand: 0, low_stock_threshold: 0 },
      { onConflict: "branch_id,inventory_item_id", ignoreDuplicates: true },
    );
  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  // Read current on_hand
  const { data: current, error: readError } = await supabase
    .from("branch_inventory")
    .select("on_hand")
    .eq("branch_id", branch_id)
    .eq("inventory_item_id", inventory_item_id)
    .single();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 400 });

  const newOnHand = Number(current.on_hand) + quantity_delta;
  if (newOnHand < 0) {
    return NextResponse.json(
      { error: `Adjustment would result in negative stock (current: ${current.on_hand}, delta: ${quantity_delta}).` },
      { status: 422 },
    );
  }

  // Update on_hand
  const { error: updateError } = await supabase
    .from("branch_inventory")
    .update({ on_hand: newOnHand })
    .eq("branch_id", branch_id)
    .eq("inventory_item_id", inventory_item_id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  // Write movement record
  const { data: movement, error: movError } = await supabase
    .from("inventory_movements")
    .insert({
      movement_type: "adjustment",
      branch_id,
      inventory_item_id,
      quantity_delta,
      reason_code,
      notes: notes ?? null,
      actor_user_id: userId,
    })
    .select()
    .single();

  if (movError) return NextResponse.json({ error: movError.message }, { status: 400 });

  await inventoryNotifications.notifyStockTransitions({
    supabase,
    actorUserId: userId,
    transitions: [
      {
        branchId: branch_id,
        inventoryItemId: inventory_item_id,
        previousOnHand: Number(current.on_hand),
        currentOnHand: newOnHand,
      },
    ],
  });

  return NextResponse.json({ data: { movement, new_on_hand: newOnHand } }, { status: 201 });
}
