import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const querySchema = z.object({
  active_only: z.coerce.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const resolvedParams = await params;
  const parsed = paramsSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid branch ID.", issues: parsed.error.issues },
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

  const { supabase } = session.data;
  const branchId = parsed.data.id;
  const activeOnly = queryParsed.data.active_only ?? true;

  // Verify branch exists
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .maybeSingle();

  if (!branch) {
    return NextResponse.json(
      { error: "Branch not found." },
      { status: 404 }
    );
  }

  // Get services offered at this branch
  let query = supabase
    .from("branch_services")
    .select(`
      service_id,
      is_active,
      min_price_cents,
      max_price_cents,
      duration_minutes,
      service:services(
        id,
        name,
        slug,
        description,
        min_price_cents,
        max_price_cents,
        currency,
        duration_minutes,
        cover_image_url,
        status,
        is_featured,
        category:service_categories(id, name, slug)
      )
    `)
    .eq("branch_id", branchId);

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data: branchServices, error } = await query
    .order("service(name)", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clean up the response data
  const services = (branchServices ?? []).map(bs => {
    const service = Array.isArray(bs.service) ? bs.service[0] : bs.service;
    const category = service?.category 
      ? (Array.isArray(service.category) ? service.category[0] : service.category)
      : null;

    return {
      ...service,
      category,
      branch_service: {
        is_active: bs.is_active,
        min_price_cents: bs.min_price_cents,
        max_price_cents: bs.max_price_cents,
        duration_minutes: bs.duration_minutes,
      }
    };
  }).filter(service => service.id); // Filter out any null services

  return NextResponse.json({ data: services });
}