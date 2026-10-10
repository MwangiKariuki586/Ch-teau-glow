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

// GET /api/admin/packages/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase } = session.data;

  try {
    const { id } = await params;

    const { data: pkg, error: packageError } = await supabase
      .from("packages")
      .select("*")
      .eq("id", id)
      .single();

    if (packageError || !pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const { data: items } = await supabase
      .from("package_items")
      .select("*, service:services(id, name, slug)")
      .eq("package_id", id)
      .order("display_order");

    return NextResponse.json({ data: { ...pkg, items } });
  } catch (error) {
    console.error("Get package error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get package" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/packages/[id]
export async function PATCH(
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
    const { items, ...packageData } = body;

    const packageValidation = packageSchema.safeParse(packageData);
    if (!packageValidation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: packageValidation.error.issues },
        { status: 400 }
      );
    }

    if (items !== undefined) {
      const itemsValidation = z.array(packageItemSchema).safeParse(items);
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

    // Fetch old data for audit
    const { data: oldPackage } = await supabase
      .from("packages")
      .select("*")
      .eq("id", id)
      .single();

    if (!oldPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Update package
    const { data: pkg, error: packageError } = await supabase
      .from("packages")
      .update(packageValidation.data)
      .eq("id", id)
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

    // Replace items if provided
    if (items !== undefined) {
      const itemsValidation = z.array(packageItemSchema).parse(items);

      // Delete old items
      await supabase.from("package_items").delete().eq("package_id", id);

      // Insert new items
      const itemRecords = itemsValidation.map((item, idx) => ({
        package_id: id,
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
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "update",
        table_name: "packages",
        record_id: id,
        old_data: oldPackage,
        new_data: pkg,
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ data: pkg });
  } catch (error) {
    console.error("Update package error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update package" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/packages/[id]
export async function DELETE(
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

    // Fetch old data for audit
    const { data: oldPackage } = await supabase
      .from("packages")
      .select("*")
      .eq("id", id)
      .single();

    if (!oldPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Delete package (cascade will delete items)
    const { error } = await supabase.from("packages").delete().eq("id", id);

    if (error) {
      throw error;
    }

    // Audit log (optional - don't fail if audit log fails)
    try {
      await supabase.from("audit_logs").insert({
        admin_id: userId,
        action: "delete",
        table_name: "packages",
        record_id: id,
        old_data: oldPackage,
        new_data: null,
      });
    } catch (auditError) {
      console.error("Audit log failed (non-fatal):", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete package error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete package" },
      { status: 500 }
    );
  }
}
