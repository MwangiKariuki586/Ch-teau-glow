import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildWaitlistBookingPath,
  getWaitlistSlotUnavailableRedirect,
  isWaitlistSlotUnavailableError,
  selectWaitlistOfferSlotForUser,
} from "@/lib/waitlist/server";
import { createClient } from "@/lib/supabase/server";

const selectSlotSchema = z.object({
  slot_id: z.string().uuid(),
});

export async function POST(
  request: Request,
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

  const payload = selectSlotSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid slot selection payload.", issues: payload.error.issues },
      { status: 400 },
    );
  }

  try {
    const { group_id } = await context.params;
    const data = await selectWaitlistOfferSlotForUser({
      userId: user.id,
      groupId: group_id,
      slotId: payload.data.slot_id,
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
            : "This slot is no longer available.",
      },
      { status: 400 },
    );
  }
}
