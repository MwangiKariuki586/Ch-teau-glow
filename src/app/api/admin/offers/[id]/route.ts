import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const offerSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  offer_type: z.enum(["percent_off", "fixed_credit", "free_gift", "other"]),
  code: z.string().nullable().optional(),
  value_numeric: z.number().nullable().optional(),
  currency: z.string().default("AED"),
  image_url: z.string().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  eligibility_summary: z.string().nullable().optional(),
  cta_label: z.string().nullable().optional(),
  priority: z.number().default(0),
});

const targetSchema = z.object({
  target_type: z.enum(["service", "category", "package", "all_services"]),
  target_id: z.string().uuid().nullable(),
  include: z.boolean().default(true),
});

// PATCH /api/admin/offers/[id]
export async function PATCH(
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
    const { targets, ...offerData } = body;

    const offerValidation = offerSchema.safeParse(offerData);
    if (!offerValidation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: offerValidation.error.issues },
        { status: 400 }
      );
    }

    if (targets !== undefined) {
      const targetsValidation = z.array(targetSchema).safeParse(targets);
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
    }

    // Validate percent_off range
    if (
      offerValidation.data.offer_type === "percent_off" &&
      offerValidation.data.value_numeric != null &&
      (offerValidation.data.value_numeric < 1 || offerValidation.data.value_numeric > 100)
    ) {
      return NextResponse.json(
        { error: "Percent off must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Validate fixed_credit is non-negative
    if (
      offerValidation.data.offer_type === "fixed_credit" &&
      offerValidation.data.value_numeric != null &&
      offerValidation.data.value_numeric < 0
    ) {
      return NextResponse.json(
        { error: "Fixed credit must be non-negative" },
        { status: 400 }
      );
    }

    // Validate date range
    if (
      offerValidation.data.starts_at &&
      offerValidation.data.ends_at &&
      new Date(offerValidation.data.starts_at) >= new Date(offerValidation.data.ends_at)
    ) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Fetch old data for audit
    const { data: oldOffer } = await supabase
      .from("offers")
      .select("*")
      .eq("id", id)
      .single();

    if (!oldOffer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Update offer
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .update({
        ...offerValidation.data,
        applies_to: "service", // backward compat
        service_id: null,
        category_id: null,
        package_id: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (offerError) {
      if (offerError.code === "23505" && offerError.message.includes("code")) {
        return NextResponse.json(
          { error: "Offer code already exists" },
          { status: 409 }
        );
      }
      throw offerError;
    }

    // Replace targets if provided
    if (targets !== undefined) {
      const targetsValidation = z.array(targetSchema).parse(targets);

      // Delete old targets
      await supabase.from("offer_targets").delete().eq("offer_id", id);

      // Insert new targets
      const targetRecords = targetsValidation.map((t) => ({
        offer_id: id,
        target_type: t.target_type,
        target_id: t.target_id,
        include: t.include,
      }));

      const { error: targetsError } = await supabase
        .from("offer_targets")
        .insert(targetRecords);

      if (targetsError) {
        throw targetsError;
      }
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "update",
        table_name: "offers",
        record_id: id,
        old_data: oldOffer,
        new_data: offer,
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ data: offer });
  } catch (error) {
    console.error("Update offer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update offer" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/offers/[id]
export async function DELETE(
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

    // Fetch old data for audit
    const { data: oldOffer } = await supabase
      .from("offers")
      .select("*")
      .eq("id", id)
      .single();

    if (!oldOffer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Delete offer (cascade will delete targets)
    const { error } = await supabase.from("offers").delete().eq("id", id);

    if (error) {
      throw error;
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "delete",
        table_name: "offers",
        record_id: id,
        old_data: oldOffer,
        new_data: null,
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete offer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete offer" },
      { status: 500 }
    );
  }
}
