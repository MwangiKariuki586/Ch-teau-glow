import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const querySchema = z.object({
  branch_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  days_ahead: z.coerce.number().int().min(1).max(365).default(30),
  status: z.enum(["all", "expired", "expiring_soon"]).default("all"),
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

  const { branch_id, days_ahead, status } = parsed.data;

  // Fetch batches that are expired or expiring within days_ahead, with quantity > 0
  let query = supabase
    .from("inventory_batches")
    .select(
      "id, inventory_item_id, branch_id, lot_number, quantity, expires_at, received_at, notes, created_at, " +
      "inventory_items(id, name, sku, unit, item_type), branches(id, name, city)",
    )
    .not("expires_at", "is", null)
    .gt("quantity", 0)
    .lte("expires_at", new Date(Date.now() + days_ahead * 86400000).toISOString().split("T")[0])
    .order("expires_at", { ascending: true });

  if (branch_id) query = query.eq("branch_id", branch_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];

  type BatchRow = {
    id: string;
    inventory_item_id: string;
    branch_id: string;
    lot_number: string | null;
    quantity: number;
    expires_at: string | null;
    received_at: string;
    notes: string | null;
    created_at: string;
    inventory_items: { id: string; name: string; sku: string | null; unit: string; item_type: string } | null;
    branches: { id: string; name: string; city: string } | null;
  };

  const rows = ((data ?? []) as unknown as BatchRow[]).map((row) => ({
    ...row,
    inventory_items: Array.isArray(row.inventory_items) ? row.inventory_items[0] : row.inventory_items,
    branches: Array.isArray(row.branches) ? row.branches[0] : row.branches,
    severity: (row.expires_at! < today ? "expired" : "expiring_soon") as "expired" | "expiring_soon",
  }));

  const filteredRows =
    status === "all"
      ? rows
      : rows.filter((row) => row.severity === status);

  return NextResponse.json({ data: filteredRows, total: filteredRows.length });
}
