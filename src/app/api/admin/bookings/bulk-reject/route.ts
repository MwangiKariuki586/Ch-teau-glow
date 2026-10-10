import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const requestSchema = z.object({
  booking_ids: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().trim().min(1).max(500),
});

const rejectableStatuses = new Set(["pending", "confirmed", "rescheduled"]);

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
  const reason = parsedBody.data.reason.trim();
  const { supabase, userId: actorUserId } = session.data;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id,status,notes")
    .in("id", bookingIds);

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 400 });
  }

  const rejectable = (bookings ?? []).filter((booking) => rejectableStatuses.has(booking.status));

  if (rejectable.length === 0) {
    return NextResponse.json(
      { error: "No selected bookings can be rejected." },
      { status: 400 },
    );
  }

  const updates = await Promise.all(
    rejectable.map((booking) =>
      supabase
        .from("bookings")
        .update({
          status: "rejected",
          notes: `${booking.notes ? `${booking.notes}\n\n` : ""}Admin cancellation reason: ${reason}`,
        })
        .eq("id", booking.id),
    ),
  );

  const failed = updates
    .map((result, index) => (result.error ? rejectable[index]?.id : null))
    .filter((id): id is string => Boolean(id));

  const successfulRows = rejectable.filter((booking) => !failed.includes(booking.id));
  if (successfulRows.length > 0) {
    const auditRows = successfulRows.map((booking) => ({
      booking_id: booking.id,
      action_type: "reject",
      actor_user_id: actorUserId,
      actor_role: "admin",
      decision: "approved",
      decision_reason: "Booking rejected by admin (bulk action).",
      policy_snapshot: {
        source: "admin_bulk_reject",
        evaluated_at: new Date().toISOString(),
        previous_status: booking.status,
        next_status: "rejected",
      },
      metadata: {
        source: "admin_bulk_reject",
        previous_status: booking.status,
        next_status: "rejected",
        reason,
      },
    }));

    const { error: auditError } = await supabase.from("booking_actions").insert(auditRows);
    if (auditError) {
      console.error("Failed to insert bulk reject audit rows:", auditError);
    }
  }

  if (failed.length > 0) {
    return NextResponse.json(
      {
        error: "Some bookings could not be rejected.",
        data: {
          requested: bookingIds.length,
          updated: rejectable.length - failed.length,
          failed_ids: failed,
        },
      },
      { status: 207 },
    );
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/customer/bookings");

  return NextResponse.json({
    data: {
      requested: bookingIds.length,
      updated: rejectable.length,
      skipped: bookingIds.length - rejectable.length,
      updated_ids: rejectable.map((booking) => booking.id),
    },
  });
}
