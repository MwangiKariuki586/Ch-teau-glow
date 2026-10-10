import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const parsed = paramsSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid specialist ID.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const specialistId = parsed.data.id;

  // Get specialist with their assigned branch (explicit FK hint to avoid ambiguity with specialist_branches)
  const { data: specialist, error } = await supabase
    .from("specialists")
    .select(`
      id,
      branch_id,
      branch:branches!specialists_branch_id_fkey(
        id,
        name,
        description,
        address,
        city,
        state,
        country,
        postal_code,
        phone,
        email,
        image_url,
        is_active
      )
    `)
    .eq("id", specialistId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!specialist) {
    return NextResponse.json(
      { error: "Specialist not found or inactive." },
      { status: 404 }
    );
  }

  // Extract branch data (handle array case from Supabase joins)
  const branch = Array.isArray(specialist.branch) 
    ? specialist.branch[0] 
    : specialist.branch;

  if (!branch || !branch.is_active) {
    return NextResponse.json(
      { error: "Specialist's assigned branch not found or inactive." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: branch });
}