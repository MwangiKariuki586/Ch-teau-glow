import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";
import {
  SERVICE_OPTIONAL_DETAIL_FIELDS,
  SERVICE_OPTIONAL_DETAIL_CONFIG,
  SERVICE_OPTIONAL_DETAIL_ITEM_KEYS,
  type ServiceOptionalDetailField,
} from "@/features/admin/services/lib/service-detail-fields";
import { serviceMutationSchema } from "@/features/admin/services/lib/service-admin-schema";
import { toServiceAdminErrorResponse } from "@/features/admin/services/lib/service-route-errors";
import { syncServiceDetails } from "@/features/admin/services/lib/sync-service-details";
import { syncServiceMappings } from "@/features/admin/services/lib/sync-service-mappings";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid service id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  const { supabase } = session.data;
  const serviceId = parsedParams.data.id;

  const [
    serviceResult,
    branchServicesResult,
    specialistServicesResult,
    detailItemsResult,
    serviceDetailsResult,
  ] =
    await Promise.all([
      supabase
        .from("services")
        .select(
          "id,category_id,name,slug,description,min_price_cents,max_price_cents,currency,duration_minutes,cover_image_url,status,is_featured",
        )
        .eq("id", serviceId)
        .maybeSingle(),
      supabase
        .from("branch_services")
        .select("branch_id")
        .eq("service_id", serviceId)
        .eq("is_active", true),
      supabase
        .from("specialist_services")
        .select("specialist_id")
        .eq("service_id", serviceId)
        .eq("is_active", true),
      supabase
        .from("service_detail_items")
        .select("detail_key,detail_value")
        .eq("service_id", serviceId)
        .in("detail_key", SERVICE_OPTIONAL_DETAIL_ITEM_KEYS),
      supabase
        .from("service_details")
        .select("what_is_it,who_is_it_for,who_is_it_not_for")
        .eq("service_id", serviceId)
        .maybeSingle(),
    ]);

  const baseError =
    serviceResult.error ||
    branchServicesResult.error ||
    specialistServicesResult.error ||
    detailItemsResult.error ||
    serviceDetailsResult.error;
  if (baseError) {
    return NextResponse.json({ error: baseError.message }, { status: 400 });
  }

  if (!serviceResult.data) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const branchIds = (branchServicesResult.data ?? []).map((row) => row.branch_id);
  const specialistIds = (specialistServicesResult.data ?? []).map(
    (row) => row.specialist_id,
  );

  let branchSpecialistPairs: Array<{ branch_id: string; specialist_id: string }> =
    [];
  const detailRows = detailItemsResult.data ?? [];
  const details = serviceDetailsResult.data;

  // Optimize: Use direct foreign key lookup instead of junction table
  if (branchIds.length > 0 && specialistIds.length > 0) {
    const { data: specialists, error: specialistsError } =
      await supabase
        .from("specialists")
        .select("id, branch_id")
        .eq("is_active", true)
        .in("id", specialistIds)
        .in("branch_id", branchIds);

    if (specialistsError) {
      return NextResponse.json(
        { error: specialistsError.message },
        { status: 400 },
      );
    }

    // Convert to branch-specialist pairs format for backward compatibility
    branchSpecialistPairs = (specialists ?? []).map(specialist => ({
      branch_id: specialist.branch_id,
      specialist_id: specialist.id
    }));
  }

  const detailsFromItems = SERVICE_OPTIONAL_DETAIL_FIELDS.reduce<
    Partial<Record<ServiceOptionalDetailField, string | null>>
  >((accumulator, field) => {
    const config = SERVICE_OPTIONAL_DETAIL_CONFIG[field];
    const candidateKeys = [config.itemKey, ...(config.legacyItemKeys ?? [])];
    const match = candidateKeys
      .map((key) => detailRows.find((item) => item.detail_key === key))
      .find(Boolean);
    accumulator[field] = match?.detail_value ?? null;
    return accumulator;
  }, {});

  return NextResponse.json({
    data: {
      ...serviceResult.data,
      branch_ids: branchIds,
      specialist_ids: specialistIds,
      branch_specialist_pairs: branchSpecialistPairs,
      what_is_it: details?.what_is_it ?? serviceResult.data.description ?? "",
      who_is_it_for: details?.who_is_it_for ?? null,
      who_is_it_not_for: details?.who_is_it_not_for ?? null,
      ...detailsFromItems,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid service id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  const payload = serviceMutationSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: payload.error.issues },
      { status: 400 },
    );
  }

  const { supabase } = session.data;
  const serviceId = parsedParams.data.id;

  try {
    const input = payload.data;
    await syncServiceMappings(supabase, serviceId, input);

    const { error: updateError } = await supabase
      .from("services")
      .update({
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
      })
      .eq("id", serviceId);

    if (updateError) throw updateError;

    await syncServiceDetails(supabase, serviceId, input);

    return NextResponse.json({ data: { id: serviceId } });
  } catch (error) {
    const typedError = error as { code?: string; message?: string };
    const errorResponse = await toServiceAdminErrorResponse({
      supabase,
      error: typedError,
      fallbackMessage: "Failed to update service.",
    });
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.status },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid service id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  const { supabase } = session.data;
  const serviceId = parsedParams.data.id;

  try {
    const { data: existingService, error: existingServiceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .maybeSingle();

    if (existingServiceError) {
      throw existingServiceError;
    }

    if (!existingService) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    const { data: existingBookings, error: existingBookingsError } = await supabase
      .from("bookings")
      .select("id")
      .eq("service_id", serviceId)
      .limit(1);

    if (existingBookingsError) {
      throw existingBookingsError;
    }

    if ((existingBookings?.length ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a service with existing bookings. Archive it instead if you only need to remove it from public view.",
        },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ data: { id: serviceId } });
  } catch (error) {
    const typedError = error as { code?: string; message?: string };
    if (typedError.code === "23503") {
      return NextResponse.json(
        {
          error: "Cannot delete this service because other records still reference it.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: typedError.message ?? "Failed to delete service." },
      { status: 400 },
    );
  }
}
