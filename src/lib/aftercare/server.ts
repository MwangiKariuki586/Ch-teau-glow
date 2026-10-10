import "server-only";

import { addMinutes } from "date-fns";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const DEFAULT_AFTERCARE_DELAY_MINUTES = 0;
const MAX_AFTERCARE_DELAY_MINUTES = 24 * 60 * 14;
const AFTERCARE_DELAY_SETTINGS_KEY = "aftercare_delay_minutes_default";
const AFTERCARE_TEMPLATE_SETTINGS_KEY = "email_template_aftercare_ready";

type ServiceSupabaseClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

type AftercareTemplate = {
  subject: string;
  body: string;
};

const FALLBACK_TEMPLATE: AftercareTemplate = {
  subject: "Your after-care guidance is ready",
  body: "Hi {{customer_name}}, your after-care guidance for {{service_name}} is ready. Open {{aftercare_link}} to review it.",
};

function toNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }

  return null;
}

function clampDelayMinutes(minutes: number) {
  return Math.min(Math.max(minutes, 0), MAX_AFTERCARE_DELAY_MINUTES);
}

export type ResolvedAftercareDelay = {
  delayHours: number;
  delayMinutes: number;
  source: "service" | "global" | "default";
};

export async function resolveAftercareDelay(
  supabase: ServiceSupabaseClient,
  serviceId: string,
) : Promise<ResolvedAftercareDelay> {
  const [{ data: serviceDetails }, { data: setting }] = await Promise.all([
    supabase
      .from("service_details")
      .select("meta")
      .eq("service_id", serviceId)
      .maybeSingle(),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", AFTERCARE_DELAY_SETTINGS_KEY)
      .maybeSingle(),
  ]);

  const serviceMeta =
    serviceDetails && typeof serviceDetails.meta === "object" && serviceDetails.meta !== null
      ? (serviceDetails.meta as Record<string, unknown>)
      : {};
  const settingsValue =
    setting && typeof setting.value === "object" && setting.value !== null
      ? (setting.value as Record<string, unknown>)
      : {};

  const serviceOverride = toNonNegativeInt(serviceMeta.aftercare_delay_minutes);
  const globalDefault = toNonNegativeInt(settingsValue.minutes);
  const source: ResolvedAftercareDelay["source"] = serviceOverride !== null
    ? "service"
    : globalDefault !== null
      ? "global"
      : "default";
  const delayMinutes = clampDelayMinutes(
    serviceOverride ?? globalDefault ?? DEFAULT_AFTERCARE_DELAY_MINUTES,
  );

  return {
    delayHours: Math.ceil(delayMinutes / 60),
    delayMinutes,
    source,
  };
}

export function computeAftercareScheduledFor(completedAtIso: string, delayMinutes: number) {
  return addMinutes(new Date(completedAtIso), delayMinutes).toISOString();
}

export async function resolveAftercareTemplate(supabase: ServiceSupabaseClient) {
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", AFTERCARE_TEMPLATE_SETTINGS_KEY)
    .maybeSingle();

  const value =
    setting && typeof setting.value === "object" && setting.value !== null
      ? (setting.value as Record<string, unknown>)
      : {};

  const subject = typeof value.subject === "string" && value.subject.trim()
    ? value.subject.trim()
    : FALLBACK_TEMPLATE.subject;
  const body = typeof value.body === "string" && value.body.trim()
    ? value.body.trim()
    : FALLBACK_TEMPLATE.body;

  return { subject, body };
}

export function renderAftercareTemplate(
  template: AftercareTemplate,
  context: {
    customerName: string;
    serviceName: string;
    aftercareLink: string;
  },
) {
  const replacements: Record<string, string> = {
    "{{customer_name}}": context.customerName,
    "{{service_name}}": context.serviceName,
    "{{aftercare_link}}": context.aftercareLink,
  };

  const apply = (source: string) =>
    Object.entries(replacements).reduce(
      (output, [placeholder, replacement]) => output.replaceAll(placeholder, replacement),
      source,
    );

  return {
    subject: apply(template.subject),
    body: apply(template.body),
  };
}

export async function sendAftercareEmail(params: {
  to: string;
  subject: string;
  body: string;
}) {
  const fromEmail = process.env.AFTERCARE_FROM_EMAIL;

  if (!fromEmail) {
    console.info(
      `Aftercare email not sent via provider (AFTERCARE_FROM_EMAIL missing). To: ${params.to}`,
    );
    return {
      ok: true as const,
      mode: "noop" as const,
    };
  }

  return sendTransactionalEmail({
    from: fromEmail,
    to: params.to,
    subject: params.subject,
    text: params.body,
    html: `<p>${params.body.replace(/\n/g, "<br/>")}</p>`,
  });
}
