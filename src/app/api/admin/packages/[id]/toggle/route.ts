import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

// POST /api/admin/packages/[id]/toggle
export async function POST(
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

    // Fetch current state
    const { data: pkg } = await supabase
      .from("packages")
      .select("is_active")
      .eq("id", id)
      .single();

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const newState = !pkg.is_active;

    // Toggle
    const { data: updated, error } = await supabase
      .from("packages")
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
        table_name: "packages",
        record_id: id,
        old_data: { is_active: pkg.is_active },
        new_data: { is_active: newState },
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Toggle package error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle package" },
      { status: 500 }
    );
  }
}
