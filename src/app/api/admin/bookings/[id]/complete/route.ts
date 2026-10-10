import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { z } from "zod";
import { dispatchAftercareJobs } from "@/lib/aftercare/dispatch";
import {
  computeAftercareScheduledFor,
  resolveAftercareDelay,
} from "@/lib/aftercare/server";
import { notifyAdminsForBookingEvent } from "@/lib/notifications/admin";
import { buildAdminBookingNotificationLink } from "@/lib/notifications/server";
import { getAdminSession } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const requestSchema = z.object({
  aftercare: z
    .object({
      instructions: z.string().trim().max(4000).optional().nullable(),
      what_to_do: z.string().trim().max(4000).optional().nullable(),
      what_to_avoid: z.string().trim().max(4000).optional().nullable(),
      important_notes: z.string().trim().max(4000).optional().nullable(),
    })
    .optional(),
});

const COMPLETABLE_STATUSES = new Set(["confirmed", "rescheduled", "completed"]);
const REVIEW_NOTIFICATION_TITLE = "How was your appointment?";
const REVIEW_NOTIFICATION_BODY = "Rate your experience in 30 seconds.";

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeInstructionValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

class InvalidBodyError extends Error {}

async function parseBody(request: Request) {
  const raw = await request.text();
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new InvalidBodyError("Invalid request body.");
  }
}

async function ensureCompletionReviewNotification(params: {
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>;
  bookingId: string;
  userId: string;
}) {
  const linkUrl = `/bookings/${params.bookingId}`;

  const { data: candidateNotifications, error: existingNotificationError } = await params.supabase
    .from("notifications")
    .select("id,title,kind,link_url")
    .eq("user_id", params.userId)
    .eq("link_url", linkUrl)
    .limit(5);

  if (existingNotificationError) {
    const { data: fallbackNotifications, error: fallbackError } = await params.supabase
      .from("notifications")
      .select("id,title,link_url")
      .eq("user_id", params.userId)
      .eq("link_url", linkUrl)
      .limit(5);

    if (fallbackError) {
      console.error("Failed checking existing review notification:", fallbackError);
      return;
    }

    const existingFallback = (fallbackNotifications ?? []).find(
      (notification) => notification.title === REVIEW_NOTIFICATION_TITLE,
    );
    if (existingFallback) {
      return;
    }

    const { error: fallbackInsertError } = await params.supabase
      .from("notifications")
      .insert({
        user_id: params.userId,
        title: REVIEW_NOTIFICATION_TITLE,
        body: REVIEW_NOTIFICATION_BODY,
        link_url: linkUrl,
      });

    if (fallbackInsertError) {
      console.error("Failed creating legacy review notification:", fallbackInsertError);
    }

    return;
  }

  const existingNotification = (candidateNotifications ?? []).find((notification) => {
    if (notification.kind === "review_request") {
      return true;
    }

    return notification.title === REVIEW_NOTIFICATION_TITLE;
  });

  if (existingNotification) {
    return;
  }

  const typedInsert = await params.supabase.from("notifications").insert({
    user_id: params.userId,
    title: REVIEW_NOTIFICATION_TITLE,
    body: REVIEW_NOTIFICATION_BODY,
    link_url: linkUrl,
    kind: "review_request",
    payload: {
      booking_id: params.bookingId,
    },
  });

  if (typedInsert.error) {
    const fallbackInsert = await params.supabase.from("notifications").insert({
      user_id: params.userId,
      title: REVIEW_NOTIFICATION_TITLE,
      body: REVIEW_NOTIFICATION_BODY,
      link_url: linkUrl,
    });

    if (fallbackInsert.error) {
      console.error("Failed creating review notification:", fallbackInsert.error);
    }
  }
}

async function insertCompletionAudit(params: {
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>;
  bookingId: string;
  actorUserId: string;
  previousStatus: string;
  completedAt: string;
  scheduledFor: string;
  delayMinutes: number;
}) {
  const { error } = await params.supabase.from("booking_actions").insert({
    booking_id: params.bookingId,
    action_type: "complete",
    actor_user_id: params.actorUserId,
    actor_role: "admin",
    decision: "approved",
    decision_reason: "Booking marked as completed by admin.",
    policy_snapshot: {
      source: "admin_complete_action",
      evaluated_at: new Date().toISOString(),
      previous_status: params.previousStatus,
      next_status: "completed",
      completed_at: params.completedAt,
      scheduled_for: params.scheduledFor,
      delay_minutes: params.delayMinutes,
    },
    metadata: {
      previous_status: params.previousStatus,
      next_status: "completed",
      completed_at: params.completedAt,
      scheduled_for: params.scheduledFor,
      delay_minutes: params.delayMinutes,
    },
  });

  if (error) {
    console.error("Failed to insert completion booking action audit row:", error);
  }
}

async function upsertBookingAftercareInstructions(params: {
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>;
  bookingId: string;
  actorUserId: string;
  values: z.infer<typeof requestSchema>["aftercare"];
}) {
  if (!params.values) {
    return;
  }

  const payload = {
    instructions: normalizeInstructionValue(params.values.instructions),
    what_to_do: normalizeInstructionValue(params.values.what_to_do),
    what_to_avoid: normalizeInstructionValue(params.values.what_to_avoid),
    important_notes: normalizeInstructionValue(params.values.important_notes),
  };

  const hasContent = Object.values(payload).some(Boolean);
  if (!hasContent) {
    return;
  }

  const { error } = await params.supabase.from("booking_aftercare_instructions").upsert(
    {
      booking_id: params.bookingId,
      ...payload,
      created_by: params.actorUserId,
      updated_by: params.actorUserId,
    },
    {
      onConflict: "booking_id",
    },
  );

  if (error) {
    throw new Error("Booking after-care instructions could not be saved.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid booking id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  let parsedBody: z.infer<typeof requestSchema>;
  try {
    parsedBody = requestSchema.parse(await parseBody(request));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid completion payload.", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof InvalidBodyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const bookingId = parsedParams.data.id;
  const actorUserId = session.data.userId;
  const serviceSupabase = await createServiceRoleClient("aftercare_dispatch");
  const warnings: string[] = [];

  const { data: booking, error: bookingError } = await serviceSupabase
    .from("bookings")
    .select("id,user_id,service_id,branch_id,specialist_id,status,completed_at,starts_at,ends_at,notes")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: "Booking could not be loaded." }, { status: 400 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (!COMPLETABLE_STATUSES.has(booking.status)) {
    return NextResponse.json(
      { error: "Only confirmed or rescheduled bookings can be marked as completed." },
      { status: 400 },
    );
  }

  try {
    await upsertBookingAftercareInstructions({
      supabase: serviceSupabase,
      bookingId,
      actorUserId,
      values: parsedBody.aftercare,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "After-care instructions could not be saved." },
      { status: 400 },
    );
  }

  const completionTimestamp = booking.completed_at ?? new Date().toISOString();

  const { data: updatedBooking, error: updateError } = await serviceSupabase
    .from("bookings")
    .update({
      status: "completed",
      completed_at: completionTimestamp,
    })
    .eq("id", bookingId)
    .select("id,user_id,service_id,status,completed_at,starts_at,ends_at,notes")
    .single();

  if (updateError) {
    return NextResponse.json({ error: "This booking could not be marked as completed." }, { status: 400 });
  }

  const { data: bookingContext, error: bookingContextError } = await serviceSupabase
    .from("bookings")
    .select(
      "id,user_id,service_id,branch_id,specialist_id,completed_at,starts_at,ends_at,service:services(name),branch:branches(name),specialist:specialists(name)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingContextError || !bookingContext) {
    return NextResponse.json(
      { error: "Booking context could not be loaded." },
      { status: 500 },
    );
  }

  const service = toSingle(bookingContext.service);
  const branch = toSingle(bookingContext.branch);
  const specialist = toSingle(bookingContext.specialist);

  const { data: profile } = await serviceSupabase
    .from("user_profiles")
    .select("email,first_name,last_name")
    .eq("user_id", bookingContext.user_id)
    .maybeSingle();

  const aftercareLinkPath = `/bookings/${bookingId}/aftercare`;
  const adminLinkUrl = buildAdminBookingNotificationLink(bookingId);
  const resolvedDelay = await resolveAftercareDelay(serviceSupabase, updatedBooking.service_id);
  const persistedDelayHours = Math.max(1, Math.ceil(resolvedDelay.delayMinutes / 60));
  const scheduledFor = computeAftercareScheduledFor(
    updatedBooking.completed_at ?? completionTimestamp,
    resolvedDelay.delayMinutes,
  );

  const { data: existingJob, error: existingJobError } = await serviceSupabase
    .from("aftercare_jobs")
    .select("id,status,scheduled_for,delay_hours,delay_minutes,payload")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingJobError) {
    return NextResponse.json({ error: "After-care delivery state could not be loaded." }, { status: 500 });
  }

  if (existingJob?.status !== "sent") {
    const payloadSnapshot = {
      source: "admin_complete_action",
      booking_id: bookingId,
      service_name: service?.name ?? null,
      branch_name: branch?.name ?? null,
      specialist_name: specialist?.name ?? null,
      customer_email: profile?.email?.trim() || null,
      customer_name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || null,
      completed_at: updatedBooking.completed_at ?? completionTimestamp,
      scheduled_for: scheduledFor,
      aftercare_link_path: aftercareLinkPath,
      delay_source: resolvedDelay.source,
      resolved_delay_minutes: resolvedDelay.delayMinutes,
    };

    const { error: upsertError } = await serviceSupabase.from("aftercare_jobs").upsert(
      {
        booking_id: bookingId,
        user_id: updatedBooking.user_id,
        service_id: updatedBooking.service_id,
        scheduled_for: scheduledFor,
        delay_hours: persistedDelayHours,
        delay_minutes: resolvedDelay.delayMinutes,
        status: "scheduled",
        attempts: 0,
        last_error: null,
        payload: payloadSnapshot,
        sent_at: null,
        processing_started_at: null,
      },
      { onConflict: "booking_id" },
    );

    if (upsertError) {
      return NextResponse.json({ error: "After-care delivery could not be scheduled." }, { status: 500 });
    }

    if (resolvedDelay.delayMinutes === 0) {
      try {
        const dispatchSummary = await dispatchAftercareJobs({
          supabase: serviceSupabase,
          bookingId,
          limit: 1,
        });

        if (dispatchSummary.legacyNotificationFallbacks > 0) {
          warnings.push(
            "After-care was sent using the legacy notification format. Apply the latest notification migration to enable the richer CTA and instruction preview.",
          );
        }
      } catch (error) {
        console.error("Immediate after-care dispatch failed:", error);
      }
    }
  }

  const { data: finalJob, error: finalJobError } = await serviceSupabase
    .from("aftercare_jobs")
    .select("status,scheduled_for,delay_hours,delay_minutes,payload")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (finalJobError) {
    return NextResponse.json({ error: "After-care state could not be refreshed." }, { status: 500 });
  }

  const effectiveScheduledFor = finalJob?.scheduled_for ?? scheduledFor;
  const effectiveDelayHours = finalJob?.delay_hours ?? persistedDelayHours;
  const effectiveDelayMinutes = finalJob?.delay_minutes ?? resolvedDelay.delayMinutes;
  const jobStatus = finalJob?.status ?? "scheduled";

  revalidatePath("/admin/bookings");
  revalidatePath("/customer/bookings");
  revalidatePath(`/customer/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/bookings/${bookingId}/aftercare`);
  revalidatePath("/notifications");

  await ensureCompletionReviewNotification({
    supabase: serviceSupabase,
    bookingId,
    userId: bookingContext.user_id,
  });

  await insertCompletionAudit({
    supabase: serviceSupabase,
    bookingId,
    actorUserId,
    previousStatus: booking.status,
    completedAt: updatedBooking.completed_at ?? completionTimestamp,
    scheduledFor: effectiveScheduledFor,
    delayMinutes: effectiveDelayMinutes,
  });

  await notifyAdminsForBookingEvent({
    supabase: serviceSupabase,
    eventType: "booking_completed",
    bookingId,
    actorUserId,
    title: "Booking completed",
    body: `${service?.name ?? "Booking"} on ${format(new Date(bookingContext.starts_at), "MMM d, yyyy h:mm a")} was marked as completed.`,
    linkUrl: adminLinkUrl,
    dedupeKey: `admin:booking_completed:${bookingId}`,
    meta: {
      booking_id: bookingId,
      service_name: service?.name ?? null,
      branch_name: branch?.name ?? null,
      specialist_name: specialist?.name ?? null,
      scheduled_at_label: format(new Date(bookingContext.starts_at), "MMM d, yyyy h:mm a"),
      customer_email: profile?.email ?? null,
      customer_name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || null,
    },
  });

  return NextResponse.json({
    data: {
      booking: updatedBooking,
      aftercare: {
        scheduled_for: effectiveScheduledFor,
        delay_hours: effectiveDelayHours,
        delay_minutes: effectiveDelayMinutes,
        status: jobStatus,
      },
    },
    warnings,
  });
}
