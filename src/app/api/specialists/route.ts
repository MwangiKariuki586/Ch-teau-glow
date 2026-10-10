import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const querySchema = z.object({
  service_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const supabase = await createServiceRoleClient("availability_read");
    const { service_id, branch_id, limit = 20 } = parsed.data;

    // If service_id provided, verify it exists and is published
    if (service_id) {
      const { data: service } = await supabase
        .from("services")
        .select("id")
        .eq("id", service_id)
        .eq("status", "published")
        .maybeSingle();

      if (!service) {
        return NextResponse.json(
          { error: "Service not found or not published." },
          { status: 404 },
        );
      }
    }

    // Resolve specialist IDs for this branch via junction table
    let specialistIds: string[] | null = null;
    if (branch_id) {
      const { data: branchSpecialists, error: bsError } = await supabase
        .from("specialist_branches")
        .select("specialist_id")
        .eq("branch_id", branch_id)
        .eq("is_active", true);

      if (bsError) {
        return NextResponse.json({ error: bsError.message }, { status: 500 });
      }

      specialistIds = (branchSpecialists ?? []).map((r) => r.specialist_id);
      if (specialistIds.length === 0) {
        return NextResponse.json({ data: [] });
      }
    }

    // Build select — use explicit FK hint to disambiguate the two specialists→branches relationships
    // (specialists_branch_id_fkey direct FK vs specialist_branches junction table)
    const selectCols = service_id
      ? `id, name, title, bio, image_url, availability, branch_id,
         branch:branches!specialists_branch_id_fkey(id, name, city, country, address, image_url),
         specialist_services!inner(service_id, is_active)`
      : `id, name, title, bio, image_url, availability, branch_id,
         branch:branches!specialists_branch_id_fkey(id, name, city, country, address, image_url)`;

    let query = supabase
      .from("specialists")
      .select(selectCols)
      .eq("is_active", true);

    if (specialistIds !== null) {
      query = query.in("id", specialistIds);
    }

    if (service_id) {
      query = query
        .eq("specialist_services.service_id", service_id)
        .eq("specialist_services.is_active", true);
    }

    const { data, error } = await query
      .order("name", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[specialists] query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const cleanedSpecialists = (data ?? []).map((specialist: any) => {
      // Handle potential branch data structure variations
      const branch = specialist.branch && typeof specialist.branch === 'object'
        ? (Array.isArray(specialist.branch) ? specialist.branch[0] : specialist.branch)
        : null;

      return {
        id: specialist.id,
        name: specialist.name,
        title: specialist.title,
        bio: specialist.bio,
        image_url: specialist.image_url,
        availability: specialist.availability,
        branch_id: specialist.branch_id,
        branch,
      };
    });

    return NextResponse.json({ data: cleanedSpecialists });
  } catch (error) {
    console.error("[specialists] caught error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
