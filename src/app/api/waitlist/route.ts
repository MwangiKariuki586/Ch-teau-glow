import { NextResponse } from "next/server";
import { z } from "zod";
import { validateBookingConsistency } from "@/lib/validation/booking-validation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

const createWaitlistSchema = z
  .object({
    service_id: z.string().uuid(),
    branch_id: z.string().uuid(),
    preferred_specialist_id: z.string().uuid().nullable().optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time_window: z.enum(["morning", "afternoon", "evening"]).nullable().optional(),
    tz_offset_minutes: z.number().int().min(-840).max(840).optional(),
  })
  .refine((value) => value.date_to >= value.date_from, {
    message: "date_to must be on or after date_from",
    path: ["date_to"],
  });

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const requestsResult = await supabase
    .from("waitlist_requests")
    .select(
      "id,service_id,branch_id,preferred_specialist_id,date_from,date_to,time_window,status,cooldown_until,created_at,updated_at,service:services(id,name,slug),branch:branches(id,name),preferred_specialist:specialists(id,name,title)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (requestsResult.error) {
    return NextResponse.json({ error: requestsResult.error.message }, { status: 400 });
  }

  const requestIds = (requestsResult.data ?? []).map((row) => row.id);
  const offersResult =
    requestIds.length > 0
      ? await supabase
          .from("waitlist_offer_groups")
          .select(
            "id,waitlist_request_id,status,offer_expires_at,created_at,accepted_at,request:waitlist_requests(service:services(id,name,slug),branch:branches(id,name)),slots:waitlist_slot_offers(id,specialist_id,starts_at,ends_at,status,accepted_at,specialist:specialists(id,name,title))",
          )
          .in("waitlist_request_id", requestIds)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [], error: null };

  if (offersResult.error) {
    return NextResponse.json({ error: offersResult.error.message }, { status: 400 });
  }

  return NextResponse.json({
    data: {
      requests: requestsResult.data ?? [],
      offers: offersResult.data ?? [],
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = createWaitlistSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid waitlist payload.", issues: payload.error.issues },
      { status: 400 },
    );
  }

  const { service_id, branch_id, preferred_specialist_id, date_from, date_to, time_window, tz_offset_minutes } =
    payload.data;

  const [{ data: serviceBranch }, { data: service }] = await Promise.all([
    supabase
      .from("service_branches")
      .select("service_id")
      .eq("branch_id", branch_id)
      .eq("service_id", service_id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id,name,status")
      .eq("id", service_id)
      .eq("status", "published")
      .maybeSingle(),
  ]);

  if (!serviceBranch || !service) {
    return NextResponse.json(
      { error: "This service is not currently available at the selected branch." },
      { status: 400 },
    );
  }

  if (preferred_specialist_id) {
    const validation = await validateBookingConsistency(supabase as any, {
      specialist_id: preferred_specialist_id,
      branch_id,
      service_id,
    });
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors[0]?.message ?? "Preferred specialist is invalid." },
        { status: 400 },
      );
    }
  }

  const duplicateQuery = supabase
    .from("waitlist_requests")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("service_id", service_id)
    .eq("branch_id", branch_id)
    .eq("date_from", date_from)
    .eq("date_to", date_to)
    .in("status", ["active", "paused"]);

  const duplicateWithWindow =
    time_window === null
      ? duplicateQuery.is("time_window", null)
      : duplicateQuery.eq("time_window", time_window);

  const duplicateResult = preferred_specialist_id
    ? await duplicateWithWindow
        .eq("preferred_specialist_id", preferred_specialist_id)
        .limit(1)
        .maybeSingle()
    : await duplicateWithWindow
        .is("preferred_specialist_id", null)
        .limit(1)
        .maybeSingle();

  if (duplicateResult.data) {
    return NextResponse.json(
      { data: duplicateResult.data, duplicate: true },
      { status: 200 },
    );
  }

  const { data, error } = await supabase
    .from("waitlist_requests")
    .insert({
      user_id: user.id,
      service_id,
      branch_id,
      preferred_specialist_id: preferred_specialist_id ?? null,
      date_from,
      date_to,
      time_window: time_window ?? null,
      tz_offset_minutes: tz_offset_minutes ?? 0,
    })
    .select(
      "id,service_id,branch_id,preferred_specialist_id,date_from,date_to,time_window,status,cooldown_until,created_at,updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const serviceSupabase = await createServiceRoleClient("waitlist_dispatch");
  await serviceSupabase.from("waitlist_events").insert({
    entity_type: "request",
    entity_id: data.id,
    event_type: "request.created",
    payload: {
      user_id: user.id,
      service_id,
      branch_id,
      preferred_specialist_id: preferred_specialist_id ?? null,
      time_window: time_window ?? null,
    },
  });

  return NextResponse.json({ data }, { status: 201 });
}
