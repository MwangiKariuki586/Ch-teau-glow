import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const updateSchema = z.object({
  default_fulfillment_branch_id: z.string().uuid("Must be a valid branch ID."),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "default_fulfillment_branch_id")
    .single();

  if (error || !data) {
    return NextResponse.json({ default_fulfillment_branch_id: null });
  }

  // value is stored as a plain JSON string in JSONB, e.g. "uuid-here"
  const branchId = typeof data.value === "string" ? data.value : null;
  return NextResponse.json({ default_fulfillment_branch_id: branchId });
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Verify the branch exists and is active
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", parsed.data.default_fulfillment_branch_id)
    .eq("is_active", true)
    .single();

  if (!branch) {
    return NextResponse.json(
      { error: "Selected branch not found or inactive." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: "default_fulfillment_branch_id", value: parsed.data.default_fulfillment_branch_id },
      { onConflict: "key" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ default_fulfillment_branch_id: parsed.data.default_fulfillment_branch_id });
}
