import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const targetSchema = z.object({
  target_type: z.enum(["service", "category", "package", "all_services"]),
  target_id: z.string().uuid().nullable(),
  include: z.boolean().default(true),
});

// PUT /api/admin/offers/[id]/targets
export async function PUT(
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
    const body = await request.json();

    const targetsValidation = z.array(targetSchema).safeParse(body.targets || []);
    if (!targetsValidation.success) {
      return NextResponse.json(
        { error: "Invalid targets", details: targetsValidation.error.issues },
        { status: 400 }
      );
    }

    if (targetsValidation.data.length === 0) {
      return NextResponse.json(
        { error: "At least one target is required" },
        { status: 400 }
      );
    }

    // Verify offer exists
    const { data: offer } = await supabase
      .from("offers")
      .select("id")
      .eq("id", id)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Fetch old targets for audit
    const { data: oldTargets } = await supabase
      .from("offer_targets")
      .select("*")
      .eq("offer_id", id);

    // Delete old targets
    await supabase.from("offer_targets").delete().eq("offer_id", id);

    // Insert new targets
    const targetRecords = targetsValidation.data.map((t) => ({
      offer_id: id,
      target_type: t.target_type,
      target_id: t.target_id,
      include: t.include,
    }));

    const { data: newTargets, error: targetsError } = await supabase
      .from("offer_targets")
      .insert(targetRecords)
      .select();

    if (targetsError) {
      throw targetsError;
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "update_targets",
        table_name: "offer_targets",
        record_id: id,
        old_data: oldTargets,
        new_data: newTargets,
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ data: newTargets });
  } catch (error) {
    console.error("Update targets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update targets" },
      { status: 500 }
    );
  }
}
