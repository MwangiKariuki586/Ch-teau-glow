import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  serviceId: z.string().uuid(),
});

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const resolvedParams = await params;
  const parsed = paramsSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid service ID.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const queryParsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );

  if (!queryParsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: queryParsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const serviceId = parsed.data.serviceId;
  const limit = queryParsed.data.limit ?? 20;

  // Verify service exists and is published
  const { data: service } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .eq("status", "published")
    .maybeSingle();

  if (!service) {
    return NextResponse.json(
      { error: "Service not found or not published." },
      { status: 404 }
    );
  }

  // Get branches that offer this service via service_branches junction table
  const { data: serviceBranches, error } = await supabase
    .from("service_branches")
    .select(`
      branch:branches(
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
    .eq("service_id", serviceId)
    .eq("is_active", true)
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Extract and filter branches
  const branches = (serviceBranches ?? [])
    .map(item => Array.isArray(item.branch) ? item.branch[0] : item.branch)
    .filter(branch => branch && branch.is_active)
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ data: branches });
}