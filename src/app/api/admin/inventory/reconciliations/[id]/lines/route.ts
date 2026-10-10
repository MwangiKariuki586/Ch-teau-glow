import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const linesSchema = z.object({
  lines: z.array(
    z.object({
      inventory_item_id: z.string().uuid(),
      counted_qty: z.number().min(0),
      notes: z.string().max(500).optional().nullable(),
    }),
  ),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;
  const { id } = await params;

  // Verify reconciliation is still draft
  const { data: recon } = await supabase
    .from("inventory_reconciliations")
    .select("status")
    .eq("id", id)
    .single();

  if (!recon) return NextResponse.json({ error: "Reconciliation not found." }, { status: 404 });
  if (recon.status !== "draft") {
    return NextResponse.json({ error: "Only draft reconciliations can be updated." }, { status: 422 });
  }

  const body = await request.json().catch(() => null);
  const parsed = linesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  // Upsert each line
  for (const line of parsed.data.lines) {
    await supabase
      .from("inventory_reconciliation_lines")
      .upsert(
        {
          reconciliation_id: id,
          inventory_item_id: line.inventory_item_id,
          counted_qty: line.counted_qty,
          notes: line.notes ?? null,
        },
        { onConflict: "reconciliation_id,inventory_item_id" },
      );
  }

  // Return updated lines
  const { data: lines, error } = await supabase
    .from("inventory_reconciliation_lines")
    .select("*, inventory_items(id,name,sku,unit)")
    .eq("reconciliation_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: lines ?? [] });
}
