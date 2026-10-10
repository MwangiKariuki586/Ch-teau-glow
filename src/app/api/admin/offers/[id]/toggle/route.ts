import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

// POST /api/admin/offers/[id]/toggle
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession({ useServiceRole: true, purpose: "admin_offers_write" });
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase, userId } = session.data;

  try {
    const { id } = await params;

    // Fetch current state
    const { data: offer } = await supabase
      .from("offers")
      .select("is_active")
      .eq("id", id)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const newState = !offer.is_active;

    // Toggle
    const { data: updated, error } = await supabase
      .from("offers")
      .update({ is_active: newState })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "toggle",
        table_name: "offers",
        record_id: id,
        old_data: { is_active: offer.is_active },
        new_data: { is_active: newState },
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Toggle offer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle offer" },
      { status: 500 }
    );
  }
}
