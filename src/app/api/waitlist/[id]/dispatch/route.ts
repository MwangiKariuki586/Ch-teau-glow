import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchWaitlistOffers } from "@/lib/waitlist/server";

/**
 * POST /api/waitlist/[id]/dispatch
 *
 * Immediately triggers offer dispatch for a single waitlist request owned by
 * the authenticated user. Called right after the user saves new preferences so
 * they get fresh offers without waiting for the next cron cycle.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;

  // Verify the request belongs to this user and is active
  const { data: waitlistRequest, error: requestError } = await supabase
    .from("waitlist_requests")
    .select("id,status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 400 });
  }

  if (!waitlistRequest) {
    return NextResponse.json({ error: "Waitlist request not found." }, { status: 404 });
  }

  if (waitlistRequest.status !== "active") {
    return NextResponse.json(
      { error: "Waitlist request is not active." },
      { status: 422 },
    );
  }

  try {
    const summary = await dispatchWaitlistOffers({ requestId: id, limit: 1 });
    return NextResponse.json({ data: summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dispatch failed." },
      { status: 500 },
    );
  }
}
