import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type AftercareJobRow = {
  id: string;
  booking_id: string;
  user_id: string;
  service_id: string;
  scheduled_for: string;
  delay_minutes: number;
  status: "scheduled" | "processing" | "sent" | "failed" | "cancelled";
  attempts: number;
  last_error: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  processing_started_at: string | null;
};

const MAX_ATTEMPTS = 3;
const DEFAULT_BATCH_SIZE = 25;

function toPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function sendAftercareEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      text: params.body,
      html: `<p>${params.body.replace(/\n/g, "<br/>")}</p>`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error (${response.status}): ${errorText}`);
  }

  return response.json().catch(() => null);
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const publicAppUrl = (Deno.env.get("PUBLIC_APP_URL") ?? "").replace(/\/$/, "");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!resendApiKey || !resendFromEmail) {
    return new Response(
      JSON.stringify({ error: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimedJobs, error: claimError } = await supabase.rpc(
    "claim_due_aftercare_jobs",
    { job_limit: DEFAULT_BATCH_SIZE },
  );

  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const job of (claimedJobs ?? []) as AftercareJobRow[]) {
    let payload = toPayload(job.payload);

    try {
      let customerEmail = asNonEmptyString(payload.customer_email);
      const customerNameFromPayload = asNonEmptyString(payload.customer_name);
      const serviceNameFromPayload = asNonEmptyString(payload.service_name);
      const aftercarePath =
        asNonEmptyString(payload.aftercare_link_path) ?? `/bookings/${job.booking_id}/aftercare`;
      const aftercareLink = publicAppUrl ? `${publicAppUrl}${aftercarePath}` : aftercarePath;

      if (!customerEmail) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("email,first_name,last_name")
          .eq("user_id", job.user_id)
          .maybeSingle();

        customerEmail = profile?.email?.trim() || null;
        if (!customerEmail) {
          const authUser = await supabase.auth.admin.getUserById(job.user_id);
          customerEmail = authUser.data.user?.email?.trim() || null;
        }

        const computedName = [profile?.first_name, profile?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

        payload = {
          ...payload,
          customer_email: customerEmail,
          customer_name: computedName || customerNameFromPayload || null,
        };
      }

      if (!payload.notification_created_at) {
        const { error: notificationError } = await supabase.from("notifications").insert({
          user_id: job.user_id,
          title: "After-care instructions are ready",
          body: "Tap to view your after-care guidance.",
          link_url: aftercarePath,
        });

        if (notificationError) {
          throw new Error(notificationError.message);
        }

        payload = {
          ...payload,
          notification_created_at: new Date().toISOString(),
        };
      }

      let serviceName = serviceNameFromPayload;
      if (!serviceName) {
        const { data: bookingContext } = await supabase
          .from("bookings")
          .select("service:services(name)")
          .eq("id", job.booking_id)
          .maybeSingle();

        const service = bookingContext?.service;
        serviceName = Array.isArray(service) ? (service[0]?.name ?? null) : (service?.name ?? null);
      }

      const customerName =
        asNonEmptyString(payload.customer_name) ??
        (customerEmail ? customerEmail.split("@")[0] : null) ??
        "there";
      const finalServiceName = serviceName ?? "your service";

      if (!payload.email_sent_at && !payload.email_skipped && !payload.email_failed) {
        if (!customerEmail) {
          payload = {
            ...payload,
            email_skipped: true,
            email_skip_reason: "Customer email not found.",
          };
        } else {
          const subject = "Your after-care guidance is ready";
          const body =
            `Hi ${customerName}, your after-care guidance for ${finalServiceName} is ready. ` +
            `Open ${aftercareLink} to review it.`;

          try {
            const delivery = await sendAftercareEmail({
              apiKey: resendApiKey,
              from: resendFromEmail,
              to: customerEmail,
              subject,
              body,
            });

            payload = {
              ...payload,
              email_sent_at: new Date().toISOString(),
              email_to: customerEmail,
              email_provider: "resend",
              email_message_id:
                delivery && typeof delivery === "object" && "id" in delivery
                  ? (delivery.id as string)
                  : null,
            };
          } catch (emailError) {
            const emailMessage = emailError instanceof Error
              ? emailError.message
              : "Unknown email delivery error.";
            payload = {
              ...payload,
              email_failed: true,
              email_last_error: emailMessage,
              email_failed_at:
                typeof payload.email_failed_at === "string"
                  ? payload.email_failed_at
                  : new Date().toISOString(),
              email_failure_attempt: job.attempts,
            };
          }
        }
      }

      const { error: sentError } = await supabase
        .from("aftercare_jobs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
          payload,
          processing_started_at: null,
        })
        .eq("id", job.id)
        .eq("status", "processing");

      if (sentError) {
        throw new Error(sentError.message);
      }

      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown dispatch error.";
      const nextStatus = job.attempts >= MAX_ATTEMPTS ? "failed" : "scheduled";

      await supabase
        .from("aftercare_jobs")
        .update({
          status: nextStatus,
          last_error: message,
          payload,
          processing_started_at: null,
        })
        .eq("id", job.id)
        .eq("status", "processing");

      failed += 1;
    }
  }

  return new Response(
    JSON.stringify({
      data: {
        claimed: claimedJobs?.length ?? 0,
        sent,
        failed,
      },
      ran_at: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});

