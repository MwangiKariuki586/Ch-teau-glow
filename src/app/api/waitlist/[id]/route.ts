import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

const updateWaitlistSchema = z
  .object({
    preferred_specialist_id: z.string().uuid().nullable().optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time_window: z.enum(["morning", "afternoon", "evening"]).nullable().optional(),
    status: z.enum(["active", "paused", "cancelled"]).optional(),
  })
  .refine(
    (value) =>
      !value.date_from || !value.date_to || value.date_to >= value.date_from,
    {
      message: "date_to must be on or after date_from",
      path: ["date_to"],
    },
  );

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: userError } = await getAuthenticatedUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = updateWaitlistSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid waitlist payload.", issues: payload.error.issues },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const updatePayload = {
    ...(payload.data.preferred_specialist_id !== undefined
      ? { preferred_specialist_id: payload.data.preferred_specialist_id }
      : {}),
    ...(payload.data.date_from ? { date_from: payload.data.date_from } : {}),
    ...(payload.data.date_to ? { date_to: payload.data.date_to } : {}),
    ...(payload.data.time_window !== undefined
      ? { time_window: payload.data.time_window }
      : {}),
    ...(payload.data.status ? { status: payload.data.status } : {}),
    cooldown_until: null, // Clear cooldown on preference changes so they get fast recommendations!
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("waitlist_requests")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,status,date_from,date_to,time_window,preferred_specialist_id,updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Waitlist request not found." }, { status: 404 });
  }

  const serviceSupabase = await createServiceRoleClient("waitlist_dispatch");
  
  // Wipe outstanding offers that correspond to their OLD preferences,
  // and log the update event.
  await Promise.all([
    serviceSupabase
      .from("waitlist_offer_groups")
      .update({ status: "cancelled" })
      .eq("waitlist_request_id", id)
      .eq("status", "offered"),
    serviceSupabase
      .from("waitlist_slot_offers")
      .update({ status: "cancelled" })
      .eq("waitlist_request_id", id)
      .eq("status", "offered"),
    serviceSupabase.from("waitlist_events").insert({
      entity_type: "request",
      entity_id: id,
      event_type: "request.updated",
      payload: updatePayload,
    }),
  ]);

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, user, error: userError } = await getAuthenticatedUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  const { data, error } = await supabase
    .from("waitlist_requests")
    .update({
      status: "cancelled",
      cooldown_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Waitlist request not found." }, { status: 404 });
  }

  const serviceSupabase = await createServiceRoleClient("waitlist_dispatch");
  await Promise.all([
    serviceSupabase
      .from("waitlist_offer_groups")
      .update({ status: "cancelled" })
      .eq("waitlist_request_id", id)
      .eq("status", "offered"),
    serviceSupabase.from("waitlist_slot_offers").update({ status: "cancelled" }).eq("waitlist_request_id", id).eq("status", "offered"),
    serviceSupabase.from("waitlist_events").insert({
      entity_type: "request",
      entity_id: id,
      event_type: "request.cancelled",
      payload: { user_id: user.id },
    }),
  ]);

  return NextResponse.json({ data });
}
