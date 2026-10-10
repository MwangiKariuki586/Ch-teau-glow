import "server-only";

type NotificationKind =
  | "generic"
  | "waitlist_slots_available"
  | "aftercare_ready"
  | "review_request"
  | "booking_approved"
  | "booking_rejected"
  | "booking_rescheduled"
  | "booking_reschedule_requested"
  | "booking_reschedule_accepted"
  | "booking_reschedule_declined"
  | "booking_reschedule_customer_proposed"
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
  | "admin_booking_completed"
  | "inventory_low_stock"
  | "inventory_out_of_stock"
  | "inventory_transfer_sent"
  | "inventory_transfer_received"
  | "inventory_transfer_overdue"
  | "inventory_reconciliation_applied"
  | "inventory_large_variance"
  | "inventory_expiring_soon"
  | "inventory_expired_stock"
  | "inventory_expired_stock_disposed"
  | "inventory_asset_created";

type NotificationSelectQuery = {
  eq: (column: string, value: string | null) => NotificationSelectQuery;
  limit: (value: number) => Promise<{
    data?: Array<{ id?: string }> | null;
    error?: { message?: string } | null;
  }>;
};

type NotificationTableClient = {
  select: (columns: string) => NotificationSelectQuery;
  insert: (values: Record<string, unknown>) => Promise<{
    error?: { code?: string; message?: string } | null;
  }>;
};

type NotificationClient = {
  from: (table: "notifications") => unknown;
};

export function buildBookingNotificationLink(
  bookingId: string,
  options?: { action?: string },
) {
  const action = options?.action?.trim();
  return action ? `/bookings/${bookingId}?action=${encodeURIComponent(action)}` : `/bookings/${bookingId}`;
}

export function buildAdminBookingNotificationLink(bookingId: string) {
  return `/admin/bookings/${bookingId}`;
}

export async function insertNotificationWithFallback(params: {
  supabase: NotificationClient;
  userId: string | null | undefined;
  title: string;
  body: string;
  linkUrl?: string | null;
  kind?: NotificationKind;
  payload?: Record<string, unknown>;
  dedupeKey?: string | null;
}) {
  if (!params.userId) {
    return false;
  }

  const linkUrl = params.linkUrl ?? null;
  const dedupeKey = params.dedupeKey?.trim() || null;
  const kind = params.kind ?? "generic";
  const notifications = params.supabase.from("notifications") as NotificationTableClient;

  if (dedupeKey) {
    const typedExisting = await notifications
      .select("id")
      .eq("user_id", params.userId)
      .eq("dedupe_key", dedupeKey)
      .limit(1);

    if (!typedExisting.error && (typedExisting.data?.length ?? 0) > 0) {
      return false;
    }
  }

  if (!dedupeKey) {
    const fallbackExisting = await notifications
      .select("id,title,link_url")
      .eq("user_id", params.userId)
      .eq("title", params.title)
      .eq("link_url", linkUrl)
      .limit(1);

    if (!fallbackExisting.error && (fallbackExisting.data?.length ?? 0) > 0) {
      return false;
    }
  }

  const typedInsert = await notifications.insert({
    user_id: params.userId,
    title: params.title,
    body: params.body,
    link_url: linkUrl,
    kind,
    payload: params.payload ?? {},
    dedupe_key: dedupeKey,
  });

  if (!typedInsert.error) {
    return true;
  }
  if (typedInsert.error.code === "23505") {
    return false;
  }

  const fallbackInsert = await notifications.insert({
    user_id: params.userId,
    title: params.title,
    body: params.body,
    link_url: linkUrl,
  });

  if (fallbackInsert.error && fallbackInsert.error.code !== "23505") {
    console.error("Failed creating notification:", fallbackInsert.error);
    return false;
  }

  return !fallbackInsert.error;
}
