import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";
import { inventoryNotifications } from "@/lib/notifications/inventory";

const uuidLike = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid ID format",
);

const querySchema = z.object({
  inventory_item_id: uuidLike.optional(),
  branch_id: uuidLike.optional(),
  include_empty: z.coerce.boolean().default(false),
});

const receiveSchema = z.object({
  inventory_item_id: uuidLike,
  branch_id: uuidLike,
  quantity: z.coerce.number().positive("Quantity must be greater than zero."),
  lot_number: z.string().max(100).optional().nullable(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.").optional().nullable(),
  received_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const { inventory_item_id, branch_id, include_empty } = parsed.data;

  let query = supabase
    .from("inventory_batches")
    .select(
      "id, inventory_item_id, branch_id, lot_number, quantity, expires_at, received_at, notes, created_at, " +
      "inventory_items(id, name, sku, unit), branches(id, name, city)",
    )
    .order("expires_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (inventory_item_id) query = query.eq("inventory_item_id", inventory_item_id);
  if (branch_id) query = query.eq("branch_id", branch_id);
  if (!include_empty) query = query.gt("quantity", 0);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession({
    useServiceRole: true,
    purpose: "admin_inventory_write",
  });
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase, userId } = session.data;

  const body = await request.json().catch(() => null);
  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("receive_stock_batch", {
    p_payload: {
      ...parsed.data,
      actor_user_id: userId,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const batchId =
    data &&
    typeof data === "object" &&
    "batch_id" in data &&
    typeof data.batch_id === "string"
      ? data.batch_id
      : null;

  if (batchId) {
    await inventoryNotifications.notifyBatchExpiryIfWithinWindow({
      supabase,
      batchId,
      actorUserId: userId,
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}
