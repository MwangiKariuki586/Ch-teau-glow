import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

// GET /api/admin/offers/options
export async function GET() {
  const session = await getAdminSession({ useServiceRole: true, purpose: "admin_offers_read" });
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase } = session.data;

  try {
    const [servicesRes, categoriesRes, packagesRes] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, slug, status")
        .eq("status", "published")
        .order("name"),
      supabase
        .from("service_categories")
        .select("id, name, slug, is_active")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("packages")
        .select("id, name, slug, is_active")
        .eq("is_active", true)
        .order("name"),
    ]);

    return NextResponse.json({
      data: {
        services: servicesRes.data || [],
        categories: categoriesRes.data || [],
        packages: packagesRes.data || [],
      },
    });
  } catch (error) {
    console.error("Get options error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get options" },
      { status: 500 }
    );
  }
}
