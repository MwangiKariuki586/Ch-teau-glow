import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const packageItemSchema = z.object({
  service_id: z.string().uuid(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  display_order: z.number().default(0),
});

// PUT /api/admin/packages/[id]/items
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase, userId } = session.data;

  try {
    const { id } = await params;
    const body = await request.json();

    const itemsValidation = z.array(packageItemSchema).safeParse(body.items || []);
    if (!itemsValidation.success) {
      return NextResponse.json(
        { error: "Invalid items", details: itemsValidation.error.issues },
        { status: 400 }
      );
    }

    if (itemsValidation.data.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Verify package exists
    const { data: pkg } = await supabase
      .from("packages")
      .select("id")
      .eq("id", id)
      .single();

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Fetch old items for audit
    const { data: oldItems } = await supabase
      .from("package_items")
      .select("*")
      .eq("package_id", id);

    // Delete old items
    await supabase.from("package_items").delete().eq("package_id", id);

    // Insert new items
    const itemRecords = itemsValidation.data.map((item, idx) => ({
      package_id: id,
      service_id: item.service_id,
      quantity: item.quantity,
      display_order: item.display_order ?? idx,
    }));

    const { data: newItems, error: itemsError } = await supabase
      .from("package_items")
      .insert(itemRecords)
      .select();

    if (itemsError) {
      throw itemsError;
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "update_items",
        table_name: "package_items",
        record_id: id,
        old_data: oldItems,
        new_data: newItems,
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ data: newItems });
  } catch (error) {
    console.error("Update items error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update items" },
      { status: 500 }
    );
  }
}
