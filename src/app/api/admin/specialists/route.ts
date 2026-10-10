import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const listQuerySchema = z.object({
  branch_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const createSpecialistSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  image_url: z.string().url().optional(),
  specialties: z.array(z.string()).optional(),
  availability: z.record(z.string(), z.any()).optional(),
  branch_id: z.string().uuid(),
  service_ids: z.array(z.string().uuid()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { supabase } = session.data;
  const page = Math.max(parsed.data.page ?? 1, 1);
  const pageSize = Math.max(parsed.data.pageSize ?? 20, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("specialists")
    .select(`
      id,
      name,
      title,
      bio,
      email,
      phone,
      image_url,
      specialties,
      availability,
      is_active,
      branch_id,
      created_at,
      updated_at,
      branch:branches!specialists_branch_id_fkey(id, name, city, country),
      specialist_services(
        service_id,
        is_active,
        service:services(id, name, slug)
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  if (parsed.data.branch_id) {
    query = query.eq("branch_id", parsed.data.branch_id);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clean up the response data
  const specialists = (data ?? []).map(specialist => {
    const branch = Array.isArray(specialist.branch) 
      ? specialist.branch[0] 
      : specialist.branch;
    
    const services = (specialist.specialist_services ?? [])
      .filter(ss => ss.is_active)
      .map(ss => Array.isArray(ss.service) ? ss.service[0] : ss.service)
      .filter(Boolean);

    return {
      ...specialist,
      branch,
      services,
      specialist_services: undefined // Remove the raw join data
    };
  });

  return NextResponse.json({
    data: specialists,
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

  const payload = createSpecialistSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: payload.error.issues },
      { status: 400 }
    );
  }

  const { supabase } = session.data;
  const input = payload.data;

  try {
    // Verify branch exists and is active
    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", input.branch_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!branch) {
      return NextResponse.json(
        { error: "Selected branch not found or inactive." },
        { status: 400 }
      );
    }

    // If service_ids provided, validate they are published services (many-to-many: all services available at all branches)
    if (input.service_ids && input.service_ids.length > 0) {
      const { data: validServices } = await supabase
        .from("services")
        .select("id")
        .eq("status", "published")
        .in("id", input.service_ids);

      const validIds = new Set((validServices ?? []).map(s => s.id));
      const invalidServiceIds = input.service_ids.filter(id => !validIds.has(id));

      if (invalidServiceIds.length > 0) {
        return NextResponse.json(
          { error: "Some services are not published.", invalid_service_ids: invalidServiceIds },
          { status: 400 }
        );
      }
    }

    // Create specialist
    const { data: createdSpecialist, error: createError } = await supabase
      .from("specialists")
      .insert({
        name: input.name.trim(),
        title: input.title?.trim() || null,
        bio: input.bio?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        image_url: input.image_url?.trim() || null,
        specialties: input.specialties || null,
        availability: input.availability || null,
        branch_id: input.branch_id,
        is_active: true,
      })
      .select("id")
      .single();

    if (createError) throw createError;

    // Create specialist-service relationships if provided
    if (input.service_ids && input.service_ids.length > 0) {
      const specialistServices = input.service_ids.map(serviceId => ({
        specialist_id: createdSpecialist.id,
        service_id: serviceId,
        is_active: true,
      }));

      const { error: servicesError } = await supabase
        .from("specialist_services")
        .insert(specialistServices);

      if (servicesError) throw servicesError;
    }

    return NextResponse.json({ data: { id: createdSpecialist.id } }, { status: 201 });
  } catch (error) {
    const typedError = error as { code?: string; message?: string };
    if (typedError.code === "23505") {
      return NextResponse.json(
        { error: "A specialist with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: typedError.message ?? "Failed to create specialist." },
      { status: 400 }
    );
  }
}