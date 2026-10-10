/**
 * Constructs a WaitlistOfferGroupResponse["data"] shape from a notification
 * payload so the WaitlistOfferSelector can render immediately without waiting
 * for the API fetch.
 *
 * The payload stored on the notification contains preview_slots (up to 3),
 * offer_group_id, service_name, branch_name, and offer_expires_at — enough
 * to show the slot list right away. A background revalidation will replace
 * this with the full live data shortly after mount.
 *
 * Returns null if the payload doesn't have the minimum required fields.
 */

import type { NotificationPayload } from "@/features/shared/notifications/lib/notification-utils";

type OfferInitialData = {
  group: {
    id: string;
    status: "offered" | "accepted" | "expired" | "cancelled";
    offer_expires_at: string;
    created_at: string;
  };
  request: {
    id: string;
    status: "active" | "paused" | "fulfilled" | "expired" | "cancelled";
    service_id: string;
    branch_id: string;
    preferred_specialist_id: string | null;
    date_from: string;
    date_to: string;
    time_window: "morning" | "afternoon" | "evening" | null;
  };
  service: {
    id: string;
    name: string;
    slug: string;
  };
  branch: {
    id: string;
    name: string;
  };
  slots: Array<{
    id: string;
    status: "offered" | "accepted" | "expired" | "cancelled";
    starts_at: string;
    ends_at: string;
    specialist: {
      id: string;
      name: string;
      title: string;
    };
  }>;
};

export function buildOfferInitialData(
  payload: NotificationPayload,
  notificationCreatedAt: string,
): OfferInitialData | null {
  const groupId =
    typeof payload.offer_group_id === "string" ? payload.offer_group_id : null;
  const offerExpiresAt =
    typeof payload.offer_expires_at === "string"
      ? payload.offer_expires_at
      : null;
  const serviceName =
    typeof payload.service_name === "string" ? payload.service_name : null;
  const branchName =
    typeof payload.branch_name === "string" ? payload.branch_name : null;

  if (!groupId || !offerExpiresAt || !serviceName || !branchName) {
    return null;
  }

  // Determine optimistic group status from expiry time.
  // The background revalidation will correct this if it's wrong.
  const isExpired = new Date(offerExpiresAt).getTime() < Date.now();
  const groupStatus: OfferInitialData["group"]["status"] = isExpired
    ? "expired"
    : "offered";

  // Build slots from preview_slots in the payload.
  const rawSlots = Array.isArray(payload.preview_slots)
    ? payload.preview_slots
    : [];

  const slots: OfferInitialData["slots"] = rawSlots.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const row = raw as Record<string, unknown>;

    const startsAt =
      typeof row.starts_at === "string" ? row.starts_at : null;
    const endsAt =
      typeof row.ends_at === "string" ? row.ends_at : null;
    const specialistId =
      typeof row.specialist_id === "string" ? row.specialist_id : null;
    const specialistName =
      typeof row.specialist_name === "string" ? row.specialist_name : null;

    if (!startsAt || !specialistId || !specialistName) return [];

    return [
      {
        // Use specialist_id:starts_at as a stable id — matches the shape
        // used by mapPreviewSlots in server.ts
        id: `${specialistId}:${startsAt}`,
        status: groupStatus === "expired" ? "expired" : ("offered" as const),
        starts_at: startsAt,
        ends_at: endsAt ?? startsAt, // fallback; revalidation will correct
        specialist: {
          id: specialistId,
          name: specialistName,
          title:
            typeof row.specialist_title === "string"
              ? row.specialist_title
              : "",
        },
      },
    ];
  });

  return {
    group: {
      id: groupId,
      status: groupStatus,
      offer_expires_at: offerExpiresAt,
      created_at: notificationCreatedAt,
    },
    // Request, service, and branch fields are partially known from the payload.
    // We use placeholder ids — the revalidation fetch will fill in the real
    // values. The selector only needs these for the "Change preferences" dialog
    // which won't open until after revalidation completes anyway.
    request: {
      id: "",
      status: "active",
      service_id: "",
      branch_id: "",
      preferred_specialist_id: null,
      date_from: "",
      date_to: "",
      time_window: null,
    },
    service: {
      id: "",
      name: serviceName,
      slug: "",
    },
    branch: {
      id: "",
      name: branchName,
    },
    slots,
  };
}
