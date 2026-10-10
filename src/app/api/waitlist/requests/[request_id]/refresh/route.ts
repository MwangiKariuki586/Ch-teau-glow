import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { refreshWaitlistRequest } from "@/lib/waitlist/server";

const refreshSchema = z
  .object({
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time_window: z.enum(["morning", "afternoon", "evening"]).nullable().optional(),
    preferred_specialist_id: z.string().uuid().nullable().optional(),
    cancelled_reason: z.enum(["preferences_changed", "rejoin"]).optional(),
  })
  .refine(
    (value) =>
      !value.date_from || !value.date_to || value.date_to >= value.date_from,
    {
      message: "date_to must be on or after date_from",
      path: ["date_to"],
    },
  );

/**
 * POST /api/waitlist/requests/[request_id]/refresh
 *
 * Single source of truth for "Change preferences" and "Rejoin / Check new times".
 *
 * Atomically:
 *   1. Validates auth + ownership
 *   2. Applies optional preference updates
 *   3. Cancels all active offer groups for this request
 *   4. Generates a fresh shortlist via the availability engine
 *   5. Creates a new offer group + slot offers
 *   6. Creates a NEW in-app notification (no email)
 *   7. Returns { offer_group_id, notification_id, slot_count, offer_expires_at }
 *
 * Idempotent: rapid clicks within the same 30-second bucket return the same
 * group/notification instead of creating duplicates.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ request_id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid refresh payload.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { request_id } = await context.params;
  const {
    date_from,
    date_to,
    time_window,
    preferred_specialist_id,
    cancelled_reason,
  } = parsed.data;

  // Build preferences object only when at least one field is provided
  const hasPrefs =
    date_from !== undefined ||
    date_to !== undefined ||
    time_window !== undefined ||
    preferred_specialist_id !== undefined;

  const preferences = hasPrefs
    ? {
        ...(date_from !== undefined ? { date_from } : {}),
        ...(date_to !== undefined ? { date_to } : {}),
        ...(time_window !== undefined ? { time_window } : {}),
        ...(preferred_specialist_id !== undefined
          ? { preferred_specialist_id }
          : {}),
      }
    : undefined;

  try {
    const result = await refreshWaitlistRequest({
      userId: user.id,
      requestId: request_id,
      preferences,
      cancelledReason: cancelled_reason ?? (hasPrefs ? "preferences_changed" : "rejoin"),
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Refresh failed.";

    if (message === "Waitlist request not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
