import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CustomerWaitlistRequestItem = {
  id: string;
  dateFrom: string;
  dateTo: string;
  timeWindow: "morning" | "afternoon" | "evening" | null;
  status: "active" | "paused" | "fulfilled" | "expired" | "cancelled";
  createdAt: string;
  cooldownUntil: string | null;
  serviceName: string;
  serviceSlug: string | null;
  branchName: string;
  preferredSpecialistName: string | null;
};

export type CustomerWaitlistOfferItem = {
  id: string;
  waitlistRequestId: string;
  status: "offered" | "accepted" | "expired" | "cancelled";
  offerExpiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  serviceName: string;
  branchName: string;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: "offered" | "accepted" | "expired" | "cancelled";
    specialistName: string;
  }>;
};

type OfferGroupRow = {
  id: string;
  waitlistRequestId: string;
  status: "offered" | "accepted" | "expired" | "cancelled";
  offerExpiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  serviceName: string;
  branchName: string;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: "offered" | "accepted" | "expired" | "cancelled";
    specialistName: string;
  }>;
};

type RequestRow = {
  id: string;
  date_from: string;
  date_to: string;
  time_window: "morning" | "afternoon" | "evening" | null;
  status: "active" | "paused" | "fulfilled" | "expired" | "cancelled";
  created_at: string;
  cooldown_until: string | null;
  service:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
  branch:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  preferred_specialist:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getCustomerWaitlists(userId: string) {
  const supabase = await createClient();

  const requestsResult = await supabase
    .from("waitlist_requests")
    .select(
      "id,date_from,date_to,time_window,status,created_at,cooldown_until,service:services(name,slug),branch:branches(name),preferred_specialist:specialists(name)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const requestIds = (requestsResult.data ?? []).map((row) => row.id);
  const offersResult =
    requestIds.length > 0
      ? await supabase
          .from("waitlist_offer_groups")
          .select(
            "id,waitlist_request_id,status,offer_expires_at,accepted_at,created_at,request:waitlist_requests(service:services(name),branch:branches(name)),slots:waitlist_slot_offers(id,starts_at,ends_at,status,specialist:specialists(name))",
          )
          .in("waitlist_request_id", requestIds)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [], error: null };

  if (requestsResult.error) {
    console.error("Failed to fetch waitlist requests:", requestsResult.error.message);
  }

  if (offersResult.error) {
    console.error("Failed to fetch waitlist offers:", offersResult.error.message);
  }

  const requests = ((requestsResult.data ?? []) as RequestRow[]).map((row) => ({
    id: row.id,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    timeWindow: row.time_window,
    status: row.status,
    createdAt: row.created_at,
    cooldownUntil: row.cooldown_until,
    serviceName: toSingle(row.service)?.name ?? "Service",
    serviceSlug: toSingle(row.service)?.slug ?? null,
    branchName: toSingle(row.branch)?.name ?? "Branch",
    preferredSpecialistName: toSingle(row.preferred_specialist)?.name ?? null,
  }));

  const offers = ((offersResult.data ?? []) as Array<{
    id: string;
    waitlist_request_id: string;
    status: "offered" | "accepted" | "expired" | "cancelled";
    offer_expires_at: string;
    accepted_at: string | null;
    created_at: string;
    request:
      | {
          service: { name: string } | { name: string }[] | null;
          branch: { name: string } | { name: string }[] | null;
        }
      | {
          service: { name: string } | { name: string }[] | null;
          branch: { name: string } | { name: string }[] | null;
        }[]
      | null;
    slots:
      | Array<{
          id: string;
          starts_at: string;
          ends_at: string;
          status: "offered" | "accepted" | "expired" | "cancelled";
          specialist:
            | { name: string }
            | { name: string }[]
            | null;
        }>
      | null;
  }>).map((row) => ({
    id: row.id,
    waitlistRequestId: row.waitlist_request_id,
    status: row.status,
    offerExpiresAt: row.offer_expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    serviceName: toSingle(toSingle(row.request)?.service)?.name ?? "Service",
    branchName: toSingle(toSingle(row.request)?.branch)?.name ?? "Branch",
    slots: (row.slots ?? [])
      .map((slot) => ({
        id: slot.id,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        status: slot.status,
        specialistName: toSingle(slot.specialist)?.name ?? "Specialist",
      }))
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
  }));

  return { requests, offers };
}
