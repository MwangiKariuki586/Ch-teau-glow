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

// GET /api/admin/offers
export async function GET(request: Request) {
  const session = await getAdminSession({ useServiceRole: true, purpose: "admin_offers_read" });
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase } = session.data;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const hasCode = searchParams.get("hasCode") || "all";
  const dateFilter = searchParams.get("dateFilter") || "all";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");

  let query = supabase
    .from("offers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false }); // Sort by recently created first

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (hasCode === "yes") {
    query = query.not("code", "is", null);
  } else if (hasCode === "no") {
    query = query.is("code", null);
  }

  // Date filter
  const now = new Date().toISOString();
  if (dateFilter === "active") {
    // Currently active: starts_at <= now AND (ends_at >= now OR ends_at is null)
    query = query.or(`starts_at.is.null,starts_at.lte.${now}`);
    query = query.or(`ends_at.is.null,ends_at.gte.${now}`);
  } else if (dateFilter === "upcoming") {
    // Upcoming: starts_at > now
    query = query.gt("starts_at", now);
  } else if (dateFilter === "expired") {
    // Expired: ends_at < now
    query = query.lt("ends_at", now);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  console.log("=== OFFERS GET DEBUG ===");
  console.log("Query params:", { status, hasCode, page, pageSize });
  console.log("Query error:", error);
  console.log("Offers count:", count);
  console.log("Offers data length:", data?.length);
  console.log("First offer (if any):", data?.[0]);

  if (error) {
    console.error("Offers query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Found ${data?.length || 0} offers`);

  // Fetch targets for each offer
  const offerIds = data?.map((o) => o.id) || [];
  console.log("Offer IDs to fetch targets for:", offerIds);

  const { data: targets, error: targetsError } = await supabase
    .from("offer_targets")
    .select("*")
    .in("offer_id", offerIds);

  console.log("Targets error:", targetsError);
  console.log("Targets data:", targets);

  if (targetsError) {
    console.error("Targets query error:", targetsError);
  }

  console.log(`Found ${targets?.length || 0} targets for ${offerIds.length} offers`);

  const offersWithTargets = data?.map((offer) => ({
    ...offer,
    targets: targets?.filter((t) => t.offer_id === offer.id) || [],
  }));

  console.log("Final offers with targets:", offersWithTargets);
  console.log("=== END DEBUG ===");

  return NextResponse.json({
    data: offersWithTargets,
    count,
    page,
    pageSize,
  });
}

// POST /api/admin/offers
export async function POST(request: Request) {
  const session = await getAdminSession({ useServiceRole: true, purpose: "admin_offers_write" });
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase, userId } = session.data;

  try {
    const body = await request.json();
    const { targets, ...offerData } = body;

    const offerValidation = offerSchema.safeParse(offerData);
    if (!offerValidation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: offerValidation.error.issues },
        { status: 400 }
      );
    }

    const targetsValidation = z.array(targetSchema).safeParse(targets || []);
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

    // Insert offer (backward compat: populate old columns with first target if single target)
    const firstTarget = targetsValidation.data[0];
    const isSingleTarget = targetsValidation.data.length === 1;
    
    let backwardCompatData: {
      applies_to: string;
      service_id: string | null;
      category_id: string | null;
      package_id: string | null;
    } = {
      applies_to: "service",
      service_id: null,
      category_id: null,
      package_id: null,
    };

    // If single target, populate old columns for backward compatibility
    if (isSingleTarget && firstTarget.target_type !== "all_services") {
      backwardCompatData.applies_to = firstTarget.target_type;
      if (firstTarget.target_type === "service") {
        backwardCompatData.service_id = firstTarget.target_id;
      } else if (firstTarget.target_type === "category") {
        backwardCompatData.category_id = firstTarget.target_id;
      } else if (firstTarget.target_type === "package") {
        backwardCompatData.package_id = firstTarget.target_id;
      }
    }

    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        ...offerValidation.data,
        ...backwardCompatData,
      })
      .select()
      .single();

    if (offerError) {
      console.error("Offer insert error:", offerError);
      if (offerError.code === "23505" && offerError.message.includes("code")) {
        return NextResponse.json(
          { error: "Offer code already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Database error: ${offerError.message}`, code: offerError.code },
        { status: 500 }
      );
    }

    // Insert targets
    const targetRecords = targetsValidation.data.map((t) => ({
      offer_id: offer.id,
      target_type: t.target_type,
      target_id: t.target_id,
      include: t.include,
    }));

    const { error: targetsError } = await supabase
      .from("offer_targets")
      .insert(targetRecords);

    if (targetsError) {
      console.error("Targets insert error:", targetsError);
      return NextResponse.json(
        { error: `Failed to create offer targets: ${targetsError.message}`, code: targetsError.code },
        { status: 500 }
      );
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "create",
        table_name: "offers",
        record_id: offer.id,
        old_data: null,
        new_data: { ...offer, targets: targetRecords },
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ data: offer }, { status: 201 });
  } catch (error) {
    console.error("Create offer error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create offer";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error("Error details:", errorDetails);
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
