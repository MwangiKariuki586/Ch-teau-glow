import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const packageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().nullable().optional(),
  package_type: z.enum(["curated", "plan"]),
  price_cents: z.number().min(0, "Price must be non-negative"),
  compare_at_cents: z.number().nullable().optional(),
  currency: z.string().default("AED"),
  save_label: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});

const packageItemSchema = z.object({
  service_id: z.string().uuid(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  display_order: z.number().default(0),
});

// GET /api/admin/packages
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase } = session.data;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const type = searchParams.get("type") || "all";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");

  let query = supabase
    .from("packages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false }); // Sort by recently created first

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (type !== "all") {
    query = query.eq("package_type", type);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch items count for each package
  const packageIds = data?.map((p) => p.id) || [];
  const { data: items } = await supabase
    .from("package_items")
    .select("package_id, service_id")
    .in("package_id", packageIds);

  const packagesWithCounts = data?.map((pkg) => ({
    ...pkg,
    items_count: items?.filter((i) => i.package_id === pkg.id).length || 0,
  }));

  return NextResponse.json({
    data: packagesWithCounts,
    count,
    page,
    pageSize,
  });
}

// POST /api/admin/packages
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase, userId } = session.data;

  try {
    const body = await request.json();
    const { items, ...packageData } = body;

    const packageValidation = packageSchema.safeParse(packageData);
    if (!packageValidation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: packageValidation.error.issues },
        { status: 400 }
      );
    }

    const itemsValidation = z.array(packageItemSchema).safeParse(items || []);
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

    // Validate compare_at >= price
    if (
      packageValidation.data.compare_at_cents !== null &&
      packageValidation.data.compare_at_cents !== undefined &&
      packageValidation.data.compare_at_cents < packageValidation.data.price_cents
    ) {
      return NextResponse.json(
        { error: "Compare at price must be greater than or equal to price" },
        { status: 400 }
      );
    }

    // Insert package
    const { data: pkg, error: packageError } = await supabase
      .from("packages")
      .insert(packageValidation.data)
      .select()
      .single();

    if (packageError) {
      if (packageError.code === "23505" && packageError.message.includes("slug")) {
        return NextResponse.json(
          { error: "Package slug already exists" },
          { status: 409 }
        );
      }
      throw packageError;
    }

    // Insert items
    const itemRecords = itemsValidation.data.map((item, idx) => ({
      package_id: pkg.id,
      service_id: item.service_id,
      quantity: item.quantity,
      display_order: item.display_order ?? idx,
    }));

    const { error: itemsError } = await supabase
      .from("package_items")
      .insert(itemRecords);

    if (itemsError) {
      throw itemsError;
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "create",
        table_name: "packages",
        record_id: pkg.id,
        old_data: null,
        new_data: { ...pkg, items: itemRecords },
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ data: pkg }, { status: 201 });
  } catch (error) {
    console.error("Create package error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create package" },
      { status: 500 }
    );
  }
}
