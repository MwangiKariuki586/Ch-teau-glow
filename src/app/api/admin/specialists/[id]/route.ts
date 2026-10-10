import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";
import { validateSpecialistServiceAssignment } from "@/lib/validation/booking-validation";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateSpecialistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  image_url: z.string().url().optional(),
  specialties: z.array(z.string()).optional(),
  availability: z.record(z.string(), z.any()).optional(),
  branch_id: z.string().uuid().optional(),
  service_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().optional(),
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
      { error: "Invalid specialist ID.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { supabase } = session.data;
  const specialistId = parsed.data.id;

  const { data: specialist, error } = await supabase
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
      branch:branches!specialists_branch_id_fkey(id, name, city, country, address),
      specialist_services(
        service_id,
        is_active,
        service:services(id, name, slug)
      )
    `)
    .eq("id", specialistId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!specialist) {
    return NextResponse.json(
      { error: "Specialist not found." },
      { status: 404 }
    );
  }

  // Clean up the response data
  const branch = Array.isArray(specialist.branch) 
    ? specialist.branch[0] 
    : specialist.branch;
  
  const services = (specialist.specialist_services ?? [])
    .filter(ss => ss.is_active)
    .map(ss => Array.isArray(ss.service) ? ss.service[0] : ss.service)
    .filter(Boolean);

  return NextResponse.json({
    data: {
      ...specialist,
      branch,
      services,
      specialist_services: undefined // Remove the raw join data
    }
  });
}

export async function PUT(
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
      { error: "Invalid specialist ID.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const payload = updateSpecialistSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: payload.error.issues },
      { status: 400 }
    );
  }

  const { supabase } = session.data;
  const specialistId = parsed.data.id;
  const input = payload.data;

  try {
    // Verify specialist exists
    const { data: existingSpecialist } = await supabase
      .from("specialists")
      .select("id, branch_id")
      .eq("id", specialistId)
      .maybeSingle();

    if (!existingSpecialist) {
      return NextResponse.json(
        { error: "Specialist not found." },
        { status: 404 }
      );
    }

    // If branch_id is being changed, validate the new branch
    if (input.branch_id && input.branch_id !== existingSpecialist.branch_id) {
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

      // When branch changes, we need to reset service assignments
      // First, deactivate all current service assignments
      await supabase
        .from("specialist_services")
        .update({ is_active: false })
        .eq("specialist_id", specialistId);
    }

    // If service_ids provided, validate they are published (many-to-many: all services available at all branches)
    const targetBranchId = input.branch_id || existingSpecialist.branch_id;
    void targetBranchId; // kept for context, no longer used for filtering
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

    // Update specialist
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.title !== undefined) updateData.title = input.title?.trim() || null;
    if (input.bio !== undefined) updateData.bio = input.bio?.trim() || null;
    if (input.email !== undefined) updateData.email = input.email?.trim() || null;
    if (input.phone !== undefined) updateData.phone = input.phone?.trim() || null;
    if (input.image_url !== undefined) updateData.image_url = input.image_url?.trim() || null;
    if (input.specialties !== undefined) updateData.specialties = input.specialties;
    if (input.availability !== undefined) updateData.availability = input.availability;
    if (input.branch_id !== undefined) updateData.branch_id = input.branch_id;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from("specialists")
        .update(updateData)
        .eq("id", specialistId);

      if (updateError) throw updateError;
    }

    // Update specialist-service relationships if provided
    if (input.service_ids !== undefined) {
      // First, deactivate all current service assignments
      await supabase
        .from("specialist_services")
        .update({ is_active: false })
        .eq("specialist_id", specialistId);

      // Then create/reactivate the new assignments
      if (input.service_ids.length > 0) {
        const specialistServices = input.service_ids.map(serviceId => ({
          specialist_id: specialistId,
          service_id: serviceId,
          is_active: true,
        }));

        const { error: servicesError } = await supabase
          .from("specialist_services")
          .upsert(specialistServices, {
            onConflict: "specialist_id,service_id"
          });

        if (servicesError) throw servicesError;
      }
    }

    return NextResponse.json({ data: { id: specialistId } });
  } catch (error) {
    const typedError = error as { code?: string; message?: string };
    if (typedError.code === "23505") {
      return NextResponse.json(
        { error: "A specialist with this email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: typedError.message ?? "Failed to update specialist." },
      { status: 400 }
    );
  }
}

export async function DELETE(
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
      { error: "Invalid specialist ID.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { supabase } = session.data;
  const specialistId = parsed.data.id;

  try {
    // Check if specialist has any active bookings
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("specialist_id", specialistId)
      .in("status", ["pending", "confirmed", "rescheduled"])
      .limit(1);

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete specialist with active bookings. Please cancel or complete all bookings first." },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("specialists")
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", specialistId);

    if (error) throw error;

    // Also deactivate all service assignments
    await supabase
      .from("specialist_services")
      .update({ is_active: false })
      .eq("specialist_id", specialistId);

    return NextResponse.json({ data: { id: specialistId } });
  } catch (error) {
    const typedError = error as { message?: string };
    return NextResponse.json(
      { error: typedError.message ?? "Failed to delete specialist." },
      { status: 400 }
    );
  }
}