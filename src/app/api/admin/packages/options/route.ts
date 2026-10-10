import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

// GET /api/admin/packages/options
export async function GET() {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { supabase } = session.data;

  try {
    const { data: services } = await supabase
      .from("services")
      .select("id, name, slug, status, category:service_categories(id, name)")
      .eq("status", "published")
      .order("name");

    return NextResponse.json({
      data: {
        services: services || [],
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
