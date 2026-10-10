export type NotificationKind =
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

export type NotificationPayload = Record<string, unknown>;

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link_url: string | null;
  kind: NotificationKind;
  payload: NotificationPayload;
  created_at: string;
  read_at: string | null;
};

const KNOWN_KINDS = new Set<NotificationKind>([
  "generic",
  "waitlist_slots_available",
  "aftercare_ready",
  "review_request",
  "booking_approved",
  "booking_rejected",
  "booking_rescheduled",
  "booking_reschedule_requested",
  "booking_reschedule_accepted",
  "booking_reschedule_declined",
  "booking_reschedule_customer_proposed",
  "admin_booking_approved",
  "admin_booking_created",
  "admin_booking_rejected",
  "admin_booking_rescheduled",
  "admin_booking_reschedule_requested",
  "admin_booking_reschedule_accepted",
  "admin_booking_reschedule_declined",
  "admin_booking_reschedule_countered",
  "admin_booking_cancelled_by_customer",
  "admin_booking_cancelled_by_admin",
  "admin_booking_completed",
  "inventory_low_stock",
  "inventory_out_of_stock",
  "inventory_transfer_sent",
  "inventory_transfer_received",
  "inventory_transfer_overdue",
  "inventory_reconciliation_applied",
  "inventory_large_variance",
  "inventory_expiring_soon",
  "inventory_expired_stock",
  "inventory_expired_stock_disposed",
  "inventory_asset_created",
]);

export function normalizeNotificationKind(value: unknown): NotificationKind {
  if (typeof value === "string" && KNOWN_KINDS.has(value as NotificationKind)) {
    return value as NotificationKind;
  }

  return "generic";
}

export function normalizeNotificationPayload(value: unknown): NotificationPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as NotificationPayload;
}

export function getNotificationCtaLabel(kind: NotificationKind, hasLink: boolean) {
  if (!hasLink) {
    return "View details";
  }

  if (kind === "aftercare_ready") {
    return "View after-care instructions";
  }

  if (kind === "waitlist_slots_available") {
    return "Choose a time";
  }

  if (kind === "review_request") {
    return "Rate your appointment";
  }

  if (kind === "booking_approved") {
    return "View confirmed booking";
  }

  if (kind === "booking_rejected") {
    return "View booking update";
  }

  if (kind === "booking_rescheduled") {
    return "View new appointment time";
  }

  if (kind === "booking_reschedule_requested") {
    return "Review proposed time";
  }

  if (kind === "booking_reschedule_accepted") {
    return "View updated booking";
  }

  if (kind === "booking_reschedule_declined") {
    return "Review booking update";
  }

  if (kind === "booking_reschedule_customer_proposed") {
    return "Review customer proposal";
  }

  if (kind.startsWith("admin_booking_")) {
    return "Open booking";
  }

  if (kind.startsWith("inventory_")) {
    return "Open inventory";
  }

  return "Open details";
}

export function getAftercareInstructionSections(payload: NotificationPayload) {
  const sections = [
    {
      key: "instructions",
      title: "Guidance",
    },
    {
      key: "what_to_do",
      title: "What to do",
    },
    {
      key: "what_to_avoid",
      title: "What to avoid",
    },
    {
      key: "important_notes",
      title: "Important notes",
    },
  ] as const;

  return sections.flatMap((section) => {
    const raw = payload[section.key];
    if (typeof raw !== "string") {
      return [];
    }

    const value = raw.trim();
    if (!value) {
      return [];
    }

    return [
      {
        key: section.key,
        title: section.title,
        value,
      },
    ];
  });
}

export function getNotificationPreviewText(notification: Pick<NotificationRow, "kind" | "body" | "payload">) {
  if (notification.kind === "waitlist_slots_available") {
    const slots = getWaitlistPreviewSlots(notification.payload);
    if (slots.length === 0) {
      return notification.body;
    }

    const first = slots[0];
    return `${first.startsAtLabel} with ${first.specialistName}`;
  }

  if (notification.kind !== "aftercare_ready") {
    return notification.body;
  }

  const sections = getAftercareInstructionSections(notification.payload);
  if (sections.length === 0) {
    return notification.body;
  }

  return sections[0].value;
}

export function getNotificationTargetHref(
  notification: Pick<NotificationRow, "id" | "kind" | "link_url">,
  basePath: string,
) {
  // Waitlist notifications should never navigate to link_url
  // They should open a drawer instead
  if (
    notification.kind === "waitlist_slots_available" ||
    notification.kind.startsWith("inventory_")
  ) {
    return `${basePath}/${notification.id}`;
  }

  if (notification.link_url) {
    return notification.link_url;
  }

  return `${basePath}/${notification.id}`;
}

type WaitlistPreviewSlot = {
  id: string;
  specialistName: string;
  specialistTitle: string;
  startsAt: string;
  startsAtLabel: string;
};

export function getWaitlistPreviewSlots(payload: NotificationPayload): WaitlistPreviewSlot[] {
  const raw = payload.preview_slots;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [];
    }

    const row = value as Record<string, unknown>;
    const startsAt = typeof row.starts_at === "string" ? row.starts_at : null;
    const specialistName =
      typeof row.specialist_name === "string" ? row.specialist_name : null;
    if (!startsAt || !specialistName) {
      return [];
    }

    const date = new Date(startsAt);
    const startsAtLabel = Number.isNaN(date.getTime())
      ? startsAt
      : new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(date);

    return [
      {
        id: typeof row.id === "string" ? row.id : startsAt,
        specialistName,
        specialistTitle:
          typeof row.specialist_title === "string" ? row.specialist_title : "",
        startsAt,
        startsAtLabel,
      },
    ];
  });
}

export function getNotificationDetailSections(notification: Pick<NotificationRow, "kind" | "payload">) {
  if (notification.kind === "aftercare_ready") {
    return getAftercareInstructionSections(notification.payload);
  }

  const sections = [
    {
      key: "reason",
      title: notification.kind === "booking_rejected" ? "Reason" : "Update reason",
    },
    {
      key: "new_starts_at_label",
      title: "New time",
    },
    {
      key: "previous_starts_at_label",
      title: "Previous time",
    },
    {
      key: "proposed_starts_at_label",
      title: "Proposed time",
    },
    {
      key: "customer_message",
      title: "Message",
    },
    {
      key: "customer_proposed_starts_at_label",
      title: "Customer proposed time",
    },
    {
      key: "scheduled_at_label",
      title: "Scheduled time",
    },
    {
      key: "service_name",
      title: "Service",
    },
    {
      key: "branch_name",
      title: "Branch",
    },
    {
      key: "customer_name",
      title: "Customer",
    },
    {
      key: "customer_email",
      title: "Customer email",
    },
    {
      key: "item_name",
      title: "Item",
    },
    {
      key: "item_type",
      title: "Item type",
    },
    {
      key: "sku",
      title: "SKU",
    },
    {
      key: "quantity",
      title: "Quantity",
    },
    {
      key: "threshold",
      title: "Threshold",
    },
    {
      key: "items_count",
      title: "Items",
    },
    {
      key: "adjusted_count",
      title: "Adjusted items",
    },
    {
      key: "net_delta",
      title: "Net delta",
    },
    {
      key: "largest_variance",
      title: "Largest variance",
    },
    {
      key: "expires_in_days",
      title: "Expires in days",
    },
    {
      key: "expires_at",
      title: "Expiry date",
    },
    {
      key: "lot_number",
      title: "Lot number",
    },
    {
      key: "duration_label",
      title: "In transit for",
    },
  ] as const;

  return sections.flatMap((section) => {
    const raw = notification.payload[section.key];
    if (typeof raw !== "string" && typeof raw !== "number") {
      return [];
    }

    const value = String(raw).trim();
    if (!value) {
      return [];
    }

    return [
      {
        key: section.key,
        title: section.title,
        value,
      },
    ];
  });
}
