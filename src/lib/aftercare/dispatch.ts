import {
  renderAftercareTemplate,
  resolveAftercareTemplate,
  sendAftercareEmail,
} from "@/lib/aftercare/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceSupabaseClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

type DueJobRow = {
  id: string;
  booking_id: string;
  user_id: string;
  service_id: string;
  scheduled_for: string;
  delay_hours: number;
  delay_minutes: number;
  status: "scheduled" | "sent" | "failed" | "cancelled" | "processing";
  attempts: number;
  last_error: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
};

const AFTERCARE_NOTIFICATION_TITLE = "After-care instructions are ready";
const AFTERCARE_NOTIFICATION_BODY = "Your booking guidance is ready to review.";

function toPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function ensureAftercareNotification(params: {
  supabase: ServiceSupabaseClient;
  userId: string;
  bookingId: string;
  relativeLink: string;
  body: string;
  payload: Record<string, unknown>;
}) {
  let mode: "typed" | "legacy" = "typed";

  const { data: existingNotifications, error: existingNotificationError } = await params.supabase
    .from("notifications")
    .select("id,title,kind")
    .eq("user_id", params.userId)
    .eq("link_url", params.relativeLink)
    .limit(5);

  if (existingNotificationError) {
    mode = "legacy";
    const { data: fallbackNotifications, error: fallbackError } = await params.supabase
      .from("notifications")
      .select("id,title")
      .eq("user_id", params.userId)
      .eq("link_url", params.relativeLink)
      .limit(5);

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    const existingFallback = (fallbackNotifications ?? []).find(
      (notification) => notification.title === AFTERCARE_NOTIFICATION_TITLE,
    );
    if (existingFallback) {
      return mode;
    }

    const { error: fallbackInsertError } = await params.supabase.from("notifications").insert({
      user_id: params.userId,
      title: AFTERCARE_NOTIFICATION_TITLE,
      body: params.body,
      link_url: params.relativeLink,
    });

    if (fallbackInsertError) {
      throw new Error(fallbackInsertError.message);
    }

    return mode;
  }

  const existingNotification = (existingNotifications ?? []).find((notification) => {
    if (notification.kind === "aftercare_ready") {
      return true;
    }

    return notification.title === AFTERCARE_NOTIFICATION_TITLE;
  });

  if (existingNotification) {
    return mode;
  }

  const { error: notificationError } = await params.supabase.from("notifications").insert({
    user_id: params.userId,
    title: AFTERCARE_NOTIFICATION_TITLE,
    body: params.body,
    link_url: params.relativeLink,
    kind: "aftercare_ready",
    payload: params.payload,
  });

  if (notificationError) {
    mode = "legacy";
    const { error: fallbackInsertError } = await params.supabase.from("notifications").insert({
      user_id: params.userId,
      title: AFTERCARE_NOTIFICATION_TITLE,
      body: params.body,
      link_url: params.relativeLink,
    });

    if (fallbackInsertError) {
      throw new Error(fallbackInsertError.message);
    }
  }

  return mode;
}

async function hydrateAftercareInstructions(params: {
  supabase: ServiceSupabaseClient;
  bookingId: string;
}) {
  const { data } = await params.supabase
    .from("booking_aftercare_instructions")
    .select("instructions,what_to_do,what_to_avoid,important_notes")
    .eq("booking_id", params.bookingId)
    .maybeSingle();

  return {
    instructions: toTrimmedString(data?.instructions),
    what_to_do: toTrimmedString(data?.what_to_do),
    what_to_avoid: toTrimmedString(data?.what_to_avoid),
    important_notes: toTrimmedString(data?.important_notes),
  };
}

export async function dispatchAftercareJobs(options?: {
  supabase?: ServiceSupabaseClient;
  bookingId?: string;
  limit?: number;
}) {
  const supabase =
    options?.supabase ?? (await createServiceRoleClient("aftercare_dispatch"));
  const nowIso = new Date().toISOString();
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "";

  let jobsQuery = supabase
    .from("aftercare_jobs")
    .select(
      "id,booking_id,user_id,service_id,scheduled_for,delay_hours,delay_minutes,status,attempts,last_error,payload,created_at,sent_at",
    )
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso)
    .lt("attempts", 3)
    .order("scheduled_for", { ascending: true })
    .limit(options?.limit ?? 50);

  if (options?.bookingId) {
    jobsQuery = jobsQuery.eq("booking_id", options.bookingId);
  }

  const { data: jobs, error: jobsError } = await jobsQuery;

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const template = await resolveAftercareTemplate(supabase);

  let claimedCount = 0;
  let sentCount = 0;
  let failedCount = 0;
  let legacyNotificationFallbacks = 0;

  for (const row of (jobs ?? []) as DueJobRow[]) {
    const claimedAttempts = row.attempts + 1;
    const { data: claimedRow, error: claimError } = await supabase
      .from("aftercare_jobs")
      .update({
        attempts: claimedAttempts,
        last_error: null,
      })
      .eq("id", row.id)
      .eq("status", "scheduled")
      .eq("attempts", row.attempts)
      .select(
        "id,booking_id,user_id,service_id,scheduled_for,delay_hours,delay_minutes,status,attempts,last_error,payload,created_at,sent_at",
      )
      .maybeSingle();

    if (claimError || !claimedRow) {
      continue;
    }

    claimedCount += 1;
    let payload = toPayload(claimedRow.payload);

    try {
      const { data: bookingContext, error: bookingError } = await supabase
        .from("bookings")
        .select("id,user_id,service_id,service:services(name)")
        .eq("id", claimedRow.booking_id)
        .maybeSingle();

      if (bookingError || !bookingContext) {
        throw new Error(bookingError?.message ?? "Booking context not found.");
      }

      const service = Array.isArray(bookingContext.service)
        ? bookingContext.service[0]
        : bookingContext.service;
      const serviceName = service?.name ?? "your service";

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name,last_name,email")
        .eq("user_id", claimedRow.user_id)
        .maybeSingle();

      let customerEmail = profile?.email?.trim() ?? "";
      if (!customerEmail) {
        const adminUser = await supabase.auth.admin.getUserById(claimedRow.user_id);
        customerEmail = adminUser.data.user?.email?.trim() ?? "";
      }

      const customerName =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
        (customerEmail ? customerEmail.split("@")[0] : "") ||
        "there";
      const relativeLink = `/bookings/${claimedRow.booking_id}/aftercare`;
      const aftercareLink = appBaseUrl ? `${appBaseUrl}${relativeLink}` : relativeLink;
      const instructions = await hydrateAftercareInstructions({
        supabase,
        bookingId: claimedRow.booking_id,
      });

      let emailError: string | null = null;

      if (!payload.notification_created_at) {
        const notificationBody =
          instructions.instructions ??
          instructions.important_notes ??
          instructions.what_to_do ??
          instructions.what_to_avoid ??
          AFTERCARE_NOTIFICATION_BODY;
        const notificationPayload = {
          booking_id: claimedRow.booking_id,
          service_name: serviceName,
          aftercare_path: relativeLink,
          ...instructions,
        };

        const notificationMode = await ensureAftercareNotification({
          supabase,
          userId: claimedRow.user_id,
          bookingId: claimedRow.booking_id,
          relativeLink,
          body: notificationBody,
          payload: notificationPayload,
        });
        if (notificationMode === "legacy") {
          legacyNotificationFallbacks += 1;
        }

        payload = {
          ...payload,
          notification_created_at: new Date().toISOString(),
          ...notificationPayload,
        };
      }

      if (!payload.email_sent_at && !payload.email_skipped && !payload.email_failed) {
        if (!customerEmail) {
          payload = {
            ...payload,
            email_skipped: true,
            email_skip_reason: "Customer email not found.",
          };
        } else {
          const rendered = renderAftercareTemplate(template, {
            customerName,
            serviceName,
            aftercareLink,
          });

          try {
            const emailResult = await sendAftercareEmail({
              to: customerEmail,
              subject: rendered.subject,
              body: rendered.body,
            });

            payload = {
              ...payload,
              email_sent_at: new Date().toISOString(),
              email_to: customerEmail,
              email_provider: "resend",
              email_delivery_mode: emailResult.mode,
              ...(emailResult.mode === "provider" && emailResult.messageId
                ? { email_message_id: emailResult.messageId }
                : {}),
            };
          } catch (error) {
            emailError = error instanceof Error ? error.message : "Unknown email delivery error.";
          }
        }
      }

      if (emailError) {
        payload = {
          ...payload,
          email_failed: true,
          email_last_error: emailError,
          email_failed_at:
            typeof payload.email_failed_at === "string"
              ? payload.email_failed_at
              : new Date().toISOString(),
          email_failure_attempt: claimedAttempts,
        };
      }

      const { error: sentUpdateError } = await supabase
        .from("aftercare_jobs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
          payload,
        })
        .eq("id", claimedRow.id);

      if (sentUpdateError) {
        throw new Error(sentUpdateError.message);
      }

      sentCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown dispatch error.";
      const nextStatus = claimedAttempts >= 3 ? "failed" : "scheduled";

      await supabase
        .from("aftercare_jobs")
        .update({
          status: nextStatus,
          last_error: message,
          payload,
        })
        .eq("id", claimedRow.id);

      failedCount += 1;
    }
  }

  return {
    due: jobs?.length ?? 0,
    claimed: claimedCount,
    sent: sentCount,
    failed: failedCount,
    legacyNotificationFallbacks,
  };
}
