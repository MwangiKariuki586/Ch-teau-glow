import "server-only";

import { insertNotificationWithFallback } from "@/lib/notifications/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

export async function getAdminRecipients(
  supabase: ServiceClient,
  excludeUserId?: string | null,
): Promise<string[]> {
  return resolveAdminRecipients(supabase, excludeUserId);
}

export async function resolveAdminRecipients(
  supabase: ServiceClient,
  excludeUserId?: string | null,
): Promise<string[]> {
  let query = supabase
    .from("user_profiles")
    .select("user_id,is_active")
    .eq("role", "admin");

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load admin recipients:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.is_active !== false)
    .map((row) => row.user_id)
    .filter((userId): userId is string => typeof userId === "string" && userId.length > 0)
    .filter((userId) => !excludeUserId || userId !== excludeUserId);
}

export async function notifyAdminsForBookingEvent(params: {
  supabase: ServiceClient;
  eventType:
    | "booking_created"
    | "booking_approved"
    | "booking_rejected"
    | "booking_rescheduled"
    | "booking_reschedule_requested"
    | "booking_reschedule_accepted"
    | "booking_reschedule_declined"
    | "booking_reschedule_countered"
    | "booking_cancelled_by_customer"
    | "booking_cancelled_by_admin"
    | "booking_completed";
  bookingId: string;
  actorUserId?: string | null;
  title: string;
  body: string;
  linkUrl: string;
  meta?: Record<string, unknown>;
  dedupeKey: string;
}) {
  const recipients = await getAdminRecipients(params.supabase, params.actorUserId ?? null);
  if (recipients.length === 0) {
    return;
  }

  await Promise.all(
    recipients.map((recipientUserId) =>
      insertNotificationWithFallback({
        supabase: params.supabase,
        userId: recipientUserId,
        kind: (`admin_${params.eventType}` as
          | "admin_booking_approved"
          | "admin_booking_created"
          | "admin_booking_rejected"
          | "admin_booking_rescheduled"
          | "admin_booking_reschedule_requested"
          | "admin_booking_reschedule_accepted"
          | "admin_booking_reschedule_declined"
          | "admin_booking_reschedule_countered"
          | "admin_booking_cancelled_by_customer"
          | "admin_booking_cancelled_by_admin"
          | "admin_booking_completed"),
        dedupeKey: `${params.dedupeKey}:to:${recipientUserId}`,
        title: params.title,
        body: params.body,
        linkUrl: params.linkUrl,
        payload: {
          ...(params.meta ?? {}),
          admin_recipient_user_id: recipientUserId,
          admin_event_type: params.eventType,
        },
      }),
    ),
  );
}
