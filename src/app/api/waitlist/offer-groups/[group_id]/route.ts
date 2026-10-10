import { NextResponse } from "next/server";
import {
  getWaitlistOfferGroupForUser,
  WaitlistOfferGroupContextError,
  WaitlistOfferGroupNotFoundError,
} from "@/lib/waitlist/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ group_id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const { group_id } = await context.params;
    const data = await getWaitlistOfferGroupForUser({
      userId: user.id,
      groupId: group_id,
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof WaitlistOfferGroupNotFoundError) {
      return NextResponse.json(
        {
          error: "This offer is no longer available.",
        },
        { status: 404 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[waitlist] offer-group route failure", {
        groupId: (await context.params).group_id,
        error,
      });
    }

    if (error instanceof WaitlistOfferGroupContextError) {
      return NextResponse.json(
        {
          error: "We couldn't load this offer right now.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "We couldn't load this offer right now.",
      },
      { status: 500 },
    );
  }
}
