import { NextResponse } from "next/server";
import {
  acceptWaitlistOfferForUser,
  buildWaitlistBookingPath,
  getWaitlistSlotUnavailableRedirect,
  isWaitlistSlotUnavailableError,
} from "@/lib/waitlist/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ offer_id: string }> },
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
    const { offer_id } = await context.params;
    const data = await acceptWaitlistOfferForUser({
      userId: user.id,
      offerId: offer_id,
    });

    return NextResponse.json({
      data,
      redirect_url: buildWaitlistBookingPath(data.group.id, data.offer.id),
    });
  } catch (error) {
    if (isWaitlistSlotUnavailableError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          redirect_url: getWaitlistSlotUnavailableRedirect(error),
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "This slot offer is no longer available.",
      },
      { status: 400 },
    );
  }
}
