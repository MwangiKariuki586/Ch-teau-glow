import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(100).optional().nullable(),
  item_type: z.enum(["retail_product", "consumable"]).optional(),
  unit: z.string().min(1).max(50).optional(),
  product_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;
  const { id } = await params;

  const [itemRes, branchStockRes, movementsRes] = await Promise.all([
    supabase.from("inventory_items").select("*").eq("id", id).single(),
    supabase
      .from("branch_inventory")
      .select("*, branches(id, name, city)")
      .eq("inventory_item_id", id),
    supabase
      .from("inventory_movements")
      .select("*")
      .eq("inventory_item_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (itemRes.error) {
    return NextResponse.json({ error: itemRes.error.message }, { status: 404 });
  }

  const branchStock = (branchStockRes.data ?? []).map((row) => ({
    ...row,
    branch: Array.isArray(row.branches) ? row.branches[0] : row.branches,
  }));

  const product =
    itemRes.data.product_id
      ? (
          await supabase
            .from("products")
            .select("id, name, slug")
            .eq("id", itemRes.data.product_id)
            .maybeSingle()
        ).data ?? null
      : null;

  return NextResponse.json({
    data: {
      item: itemRes.data,
      branch_stock: branchStock,
      movements: movementsRes.data ?? [],
      product,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { data: existingItem, error: existingItemError } = await supabase
    .from("inventory_items")
    .select("product_id")
    .eq("id", id)
    .single();

  if (existingItemError) {
    return NextResponse.json({ error: existingItemError.message }, { status: 404 });
  }

  if (existingItem.product_id) {
    const retailOwnedFields = ["name", "sku", "item_type", "product_id", "is_active"] as const;
    const attemptedRetailField = retailOwnedFields.find((field) => field in parsed.data);

    if (attemptedRetailField) {
      return NextResponse.json(
        { error: `Retail-linked inventory items cannot update '${attemptedRetailField}' from inventory.` },
        { status: 422 },
      );
    }
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
