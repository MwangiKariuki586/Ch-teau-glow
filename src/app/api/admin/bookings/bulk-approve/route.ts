import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const requestSchema = z.object({
  booking_ids: z.array(z.string().uuid()).min(1).max(100),
});

const approvableStatuses = new Set(["pending", "rescheduled"]);

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    rawBody = {};
  }

  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const bookingIds = [...new Set(parsedBody.data.booking_ids)];
  const { supabase, userId: actorUserId } = session.data;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id,status")
    .in("id", bookingIds);

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 400 });
  }

  const approvableIds = (bookings ?? [])
    .filter((booking) => approvableStatuses.has(booking.status))
    .map((booking) => booking.id);

  if (approvableIds.length === 0) {
    return NextResponse.json(
      { error: "No selected bookings can be approved." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .in("id", approvableIds);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const auditRows = approvableIds.map((bookingId) => ({
    booking_id: bookingId,
    action_type: "approve",
    actor_user_id: actorUserId,
    actor_role: "admin",
    decision: "approved",
    decision_reason: "Booking approved by admin (bulk action).",
    policy_snapshot: {
      source: "admin_bulk_approve",
      evaluated_at: new Date().toISOString(),
      next_status: "confirmed",
    },
    metadata: {
      source: "admin_bulk_approve",
      next_status: "confirmed",
    },
  }));

  const { error: auditError } = await supabase.from("booking_actions").insert(auditRows);
  if (auditError) {
    console.error("Failed to insert bulk approve audit rows:", auditError);
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/customer/bookings");

  return NextResponse.json({
    data: {
      requested: bookingIds.length,
      updated: approvableIds.length,
      skipped: bookingIds.length - approvableIds.length,
      updated_ids: approvableIds,
    },
  });
}
