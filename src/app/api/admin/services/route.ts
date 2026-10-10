import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";
import {
  serviceMutationSchema,
} from "@/features/admin/services/lib/service-admin-schema";
import { toServiceAdminErrorResponse } from "@/features/admin/services/lib/service-route-errors";
import { syncServiceDetails } from "@/features/admin/services/lib/sync-service-details";
import { syncServiceMappings } from "@/features/admin/services/lib/sync-service-mappings";

const listQuerySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { supabase } = session.data;
  const page = Math.max(parsed.data.page ?? 1, 1);
  const pageSize = Math.max(parsed.data.pageSize ?? 20, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("services")
    .select(
      "id,name,slug,status,is_featured,min_price_cents,max_price_cents,currency,duration_minutes,created_at,updated_at,category:service_categories(id,name,slug)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (parsed.data.status && parsed.data.status !== "all") {
    query = query.eq("status", parsed.data.status);
  }

  if (parsed.data.category && parsed.data.category !== "all") {
    query = query.eq("category_id", parsed.data.category);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const payload = serviceMutationSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: payload.error.issues },
      { status: 400 },
    );
  }

  const { supabase, userId } = session.data;

  try {
    const input = payload.data;
    const { data: createdService, error: createError } = await supabase
      .from("services")
      .insert({
        category_id: input.category_id,
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.what_is_it.trim(),
        min_price_cents: input.min_price_cents,
        max_price_cents: input.max_price_cents,
        currency: input.currency.trim().toUpperCase(),
        duration_minutes: input.duration_minutes,
        cover_image_url: input.cover_image_url?.trim() || null,
        status: input.status,
        is_featured: input.is_featured,
        created_by: userId,
      })
      .select("id")
      .single();

    if (createError) throw createError;

    await syncServiceMappings(supabase, createdService.id, input);
    await syncServiceDetails(supabase, createdService.id, input);

    return NextResponse.json({ data: { id: createdService.id } }, { status: 201 });
  } catch (error) {
    const typedError = error as { code?: string; message?: string };
    const errorResponse = await toServiceAdminErrorResponse({
      supabase,
      error: typedError,
      fallbackMessage: "Failed to create service.",
    });
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.status },
    );
  }
}
