import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAvailableSlotsForDate,
  getUtcDayRangeFromOffsetLocal,
} from "@/lib/bookings/availability-engine";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const querySchema = z.object({
  service_id: z.string().uuid(),
  specialist_id: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format."),
  tz_offset_minutes: z.coerce.number().int().min(-840).max(840).optional(),
  admin: z.coerce.boolean().optional(), // bypass lead-time & past-slot restrictions
});

const blockingStatuses = ["pending", "confirmed", "rescheduled"];

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { service_id, specialist_id, date } = parsed.data;
  const isAdmin = parsed.data.admin === true;
  const tzOffsetMinutes =
    parsed.data.tz_offset_minutes ?? new Date().getTimezoneOffset();
  const supabase = await createServiceRoleClient("availability_read");

  const [
    { data: service, error: serviceError },
    { data: specialist, error: specialistError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id,duration_minutes,status")
      .eq("id", service_id)
      .eq("status", "published")
      .maybeSingle(),
    supabase
      .from("specialists")
      .select("id,availability,is_active,branch_id")
      .eq("id", specialist_id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (serviceError || specialistError) {
    return NextResponse.json(
      {
        error:
          serviceError?.message ??
          specialistError?.message ??
          "Failed to load service availability context.",
      },
      { status: 500 },
    );
  }

  if (!service || !specialist) {
    console.warn('[availability] service or specialist not found', {
      service_id, specialist_id,
      service_found: !!service,
      specialist_found: !!specialist,
    });
    return NextResponse.json({ data: [] });
  }

  // For admin requests, skip specialist_service and branch_service validation
  // since the admin already selected from pre-filtered services
  if (!isAdmin) {
    // Validate that the specialist provides this service
    const { data: specialistService, error: ssError } = await supabase
      .from("specialist_services")
      .select("specialist_id")
      .eq("specialist_id", specialist_id)
      .eq("service_id", service_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!specialistService) {
      console.warn("[availability] specialist_services check failed", { specialist_id, service_id, ssError });
      return NextResponse.json({ data: [], debug: "specialist not assigned to this service" });
    }

    // Validate that the service is offered at the specialist's branch
    // Use the specialist's direct branch_id (one-to-one relationship)
    const specialistBranchId = specialist.branch_id;

    // Check if the service is offered at the specialist's branch
    const { data: serviceBranch, error: sbError } = await supabase
      .from("service_branches")
      .select("branch_id")
      .eq("branch_id", specialistBranchId)
      .eq("service_id", service_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!serviceBranch) {
      console.warn("[availability] service_branches check failed", { branch_id: specialistBranchId, service_id, sbError });
      return NextResponse.json({ data: [], debug: "service not offered at specialist branch" });
    }
  }

  const bookingDuration = Number(service.duration_minutes);
  if (Number.isNaN(bookingDuration) || bookingDuration <= 0) {
    return NextResponse.json({ data: [] });
  }

  const { start: dayStart, end: dayEnd } = getUtcDayRangeFromOffsetLocal(
    date,
    tzOffsetMinutes,
  );

  const { data: existingBookings, error: existingBookingsError } = await supabase
    .from("bookings")
    .select("starts_at,ends_at,status")
    .eq("specialist_id", specialist_id)
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString())
    .in("status", blockingStatuses);

  if (existingBookingsError) {
    return NextResponse.json({ error: existingBookingsError.message }, { status: 500 });
  }

  const slots = buildAvailableSlotsForDate({
    availability: specialist.availability,
    date,
    bookingDurationMinutes: bookingDuration,
    existingBookings: (existingBookings ?? []) as Array<{
      starts_at: string;
      ends_at: string;
    }>,
    tzOffsetMinutes,
    admin: isAdmin,
  });

  console.log('[availability] generated slots:', slots.length);
  return NextResponse.json({ data: slots });
}
