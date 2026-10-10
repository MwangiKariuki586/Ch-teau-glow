import "server-only";

import {
  addDays,
  addMinutes,
  format,
  isAfter,
  parseISO,
} from "date-fns";
import { buildAvailableSlotsForDate, getUtcDayRangeFromOffsetLocal } from "@/lib/bookings/availability-engine";
import {
  assertSlotInvariants,
  buildShortlist,
  matchesTimeWindow,
  type DispatchCandidateSlot,
} from "@/lib/waitlist/dispatcher-logic";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { insertNotificationWithFallback } from "@/lib/notifications/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getAppBaseUrl,
  getWaitlistEmailFromAddress,
  WAITLIST_DEFAULT_COOLDOWN_MINUTES,
  WAITLIST_DEFAULT_OFFER_WINDOW_MINUTES,
  WAITLIST_DEFAULT_SHORTLIST_SIZE,
  WAITLIST_DISPATCH_BATCH_SIZE,
  type WaitlistTimeWindow,
} from "@/lib/waitlist/config";

type ServiceRoleClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

type WaitlistRequestRow = {
  id: string;
  user_id: string;
  service_id: string;
  branch_id: string;
  preferred_specialist_id: string | null;
  date_from: string;
  date_to: string;
  time_window: WaitlistTimeWindow | null;
  status: "active" | "paused" | "fulfilled" | "expired" | "cancelled";
  cooldown_until: string | null;
  tz_offset_minutes: number;
  service:
    | {
        id: string;
        name: string;
        slug: string;
        duration_minutes: number;
        min_price_cents?: number;
        max_price_cents?: number;
        currency?: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
        duration_minutes: number;
        min_price_cents?: number;
        max_price_cents?: number;
        currency?: string;
      }[]
    | null;
  branch:
    | {
        id: string;
        name: string;
        city?: string;
        country?: string;
        address?: string;
      }
    | {
        id: string;
        name: string;
        city?: string;
        country?: string;
        address?: string;
      }[]
    | null;
};

type SpecialistCandidate = {
  id: string;
  name: string;
  title: string;
  image_url: string | null;
  branch_id: string | null;
  availability: unknown;
};

// CandidateSlot is compatible with DispatchCandidateSlot from dispatcher-logic
type CandidateSlot = DispatchCandidateSlot;

type WaitlistOfferGroupContext = {
  id: string;
  waitlist_request_id: string;
  status: "offered" | "accepted" | "expired" | "cancelled";
  offer_expires_at: string;
  dedupe_key: string;
  created_at: string;
  accepted_at: string | null;
  request:
    | {
        id: string;
        user_id: string;
        status: WaitlistRequestRow["status"];
        service_id: string;
        branch_id: string;
        preferred_specialist_id: string | null;
        date_from: string;
        date_to: string;
        time_window: WaitlistTimeWindow | null;
        service:
          | {
              id: string;
              name: string;
              slug: string;
              duration_minutes: number;
              min_price_cents: number;
              max_price_cents: number;
              currency: string;
            }
          | {
              id: string;
              name: string;
              slug: string;
              duration_minutes: number;
              min_price_cents: number;
              max_price_cents: number;
              currency: string;
            }[]
          | null;
        branch:
          | {
              id: string;
              name: string;
              city: string;
              country: string;
              address: string;
            }
          | {
              id: string;
              name: string;
              city: string;
              country: string;
              address: string;
            }[]
          | null;
      }
    | {
        id: string;
        user_id: string;
        status: WaitlistRequestRow["status"];
        service_id: string;
        branch_id: string;
        preferred_specialist_id: string | null;
        date_from: string;
        date_to: string;
        time_window: WaitlistTimeWindow | null;
        service:
          | {
              id: string;
              name: string;
              slug: string;
              duration_minutes: number;
              min_price_cents: number;
              max_price_cents: number;
              currency: string;
            }
          | {
              id: string;
              name: string;
              slug: string;
              duration_minutes: number;
              min_price_cents: number;
              max_price_cents: number;
              currency: string;
            }[]
          | null;
        branch:
          | {
              id: string;
              name: string;
              city: string;
              country: string;
              address: string;
            }
          | {
              id: string;
              name: string;
              city: string;
              country: string;
              address: string;
            }[]
          | null;
      }[]
    | null;
};

type WaitlistSlotOfferContext = {
  id: string;
  offer_group_id: string;
  waitlist_request_id: string;
  service_id: string;
  branch_id: string;
  specialist_id: string;
  starts_at: string;
  ends_at: string;
  status: "offered" | "accepted" | "expired" | "cancelled";
  offer_expires_at: string;
  accepted_at: string | null;
  specialist:
    | {
        id: string;
        name: string;
        title: string;
        image_url: string | null;
        branch_id: string | null;
      }
    | {
        id: string;
        name: string;
        title: string;
        image_url: string | null;
        branch_id: string | null;
      }[]
    | null;
};

export type WaitlistOfferPreviewSlot = {
  id: string;
  specialist_id: string;
  specialist_name: string;
  specialist_title: string;
  starts_at: string;
  ends_at: string;
};

export type WaitlistOfferGroupDetails = {
  group: {
    id: string;
    waitlist_request_id: string;
    status: "offered" | "accepted" | "expired" | "cancelled";
    offer_expires_at: string;
    created_at: string;
    accepted_at: string | null;
  };
  request: {
    id: string;
    status: WaitlistRequestRow["status"];
    service_id: string;
    branch_id: string;
    preferred_specialist_id: string | null;
    date_from: string;
    date_to: string;
    time_window: WaitlistTimeWindow | null;
  };
  service: {
    id: string;
    name: string;
    slug: string;
    duration_minutes: number;
    min_price_cents: number;
    max_price_cents: number;
    currency: string;
  };
  branch: {
    id: string;
    name: string;
    city: string;
    country: string;
    address: string;
  };
  slots: Array<{
    id: string;
    offer_group_id: string;
    waitlist_request_id: string;
    specialist_id: string;
    starts_at: string;
    ends_at: string;
    status: "offered" | "accepted" | "expired" | "cancelled";
    offer_expires_at: string;
    accepted_at: string | null;
    specialist: {
      id: string;
      name: string;
      title: string;
      image_url: string | null;
      branch_id: string | null;
    };
  }>;
};

export type WaitlistSelectedSlotPrefill = {
  group: WaitlistOfferGroupDetails["group"];
  offer: {
    id: string;
    status: "offered" | "accepted" | "expired" | "cancelled";
    offer_expires_at: string;
    starts_at: string;
    ends_at: string;
  };
  service: WaitlistOfferGroupDetails["service"];
  branch: WaitlistOfferGroupDetails["branch"];
  specialist: WaitlistOfferGroupDetails["slots"][number]["specialist"];
};

const BLOCKING_BOOKING_STATUSES = ["pending", "confirmed", "rescheduled"];

class WaitlistSlotUnavailableError extends Error {
  groupId: string;
  slotId: string;

  constructor(message: string, groupId: string, slotId: string) {
    super(message);
    this.name = "WaitlistSlotUnavailableError";
    this.groupId = groupId;
    this.slotId = slotId;
  }
}

export class WaitlistOfferGroupNotFoundError extends Error {
  constructor(message = "Offer group not found.") {
    super(message);
    this.name = "WaitlistOfferGroupNotFoundError";
  }
}

export class WaitlistOfferGroupContextError extends Error {
  constructor(message = "Offer group context is incomplete.") {
    super(message);
    this.name = "WaitlistOfferGroupContextError";
  }
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function buildWaitlistOfferGroupPath(groupId: string, selectedSlotId?: string) {
  const params = new URLSearchParams({
    offer_group_id: groupId,
  });
  if (selectedSlotId) {
    params.set("selected_slot", selectedSlotId);
  }

  const query = params.toString();
  return query
    ? `/waitlist/offers/${encodeURIComponent(groupId)}?${query}`
    : `/waitlist/offers/${encodeURIComponent(groupId)}`;
}

export function buildWaitlistBookingPath(groupId: string, slotId: string) {
  const params = new URLSearchParams({
    waitlist_offer_group: groupId,
    waitlist_slot: slotId,
  });
  return `/book?${params.toString()}`;
}

// matchesTimeWindow, assertSlotInvariants, and buildShortlist are imported
// from @/lib/waitlist/dispatcher-logic (extracted for testability).

function formatSlotLabel(startsAt: string) {
  return format(parseISO(startsAt), "EEE, MMM d 'at' h:mm a");
}

async function logWaitlistEvent(params: {
  supabase: ServiceRoleClient;
  entityType: "request" | "offer" | "offer_group";
  entityId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  const { error } = await params.supabase.from("waitlist_events").insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    event_type: params.eventType,
    payload: params.payload ?? {},
  });

  if (error) {
    console.error("Failed to write waitlist event:", error.message);
  }
}

async function getUserEmail(params: { supabase: ServiceRoleClient; userId: string }) {
  const { data: profile } = await params.supabase
    .from("user_profiles")
    .select("first_name,last_name,email")
    .eq("user_id", params.userId)
    .maybeSingle();

  const adminUser = !profile?.email
    ? await params.supabase.auth.admin.getUserById(params.userId)
    : null;

  const email =
    profile?.email?.trim() || adminUser?.data.user?.email?.trim() || null;
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    (email ? email.split("@")[0] : "there");

  return { email, name };
}

function mapPreviewSlots(slots: CandidateSlot[]): WaitlistOfferPreviewSlot[] {
  return slots.slice(0, 3).map((slot) => ({
    id: `${slot.specialist.id}:${slot.starts_at}`,
    specialist_id: slot.specialist.id,
    specialist_name: slot.specialist.name,
    specialist_title: slot.specialist.title,
    starts_at: slot.starts_at,
    ends_at: slot.ends_at,
  }));
}

async function notifyOfferGroup(params: {
  supabase: ServiceRoleClient;
  userId: string;
  groupId: string;
  serviceName: string;
  branchName: string;
  offerExpiresAt: string;
  previewSlots: WaitlistOfferPreviewSlot[];
  /** When true, skip email delivery (in-app notification only). */
  skipEmail?: boolean;
}): Promise<string | null> {
  const linkPath = buildWaitlistOfferGroupPath(params.groupId);
  const title = "Appointment times available";
  const body = `New times opened for ${params.serviceName} at ${params.branchName}. Choose the time that works best.`;
  const dedupeKey = `waitlist_offer_group:${params.groupId}:user:${params.userId}`;

  // Insert the in-app notification and capture its id so callers can redirect
  // the user directly to the new notification detail page.
  let notificationId: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notifClient = params.supabase.from("notifications") as any;
    const { data: inserted } = await notifClient
      .insert({
        user_id: params.userId,
        title,
        body,
        link_url: linkPath,
        kind: "waitlist_slots_available",
        payload: {
          type: "waitlist_offer_group",
          offer_group_id: params.groupId,
          service_name: params.serviceName,
          branch_name: params.branchName,
          offer_expires_at: params.offerExpiresAt,
          preview_slots: params.previewSlots,
        },
        dedupe_key: dedupeKey,
      })
      .select("id")
      .maybeSingle();
    notificationId = (inserted as { id?: string } | null)?.id ?? null;
  } catch {
    // Fallback: use the generic helper (won't return id but won't crash)
    await insertNotificationWithFallback({
      supabase: params.supabase,
      userId: params.userId,
      title,
      body,
      linkUrl: linkPath,
      kind: "waitlist_slots_available",
      dedupeKey,
      payload: {
        type: "waitlist_offer_group",
        offer_group_id: params.groupId,
        service_name: params.serviceName,
        branch_name: params.branchName,
        offer_expires_at: params.offerExpiresAt,
        preview_slots: params.previewSlots,
      },
    });
  }

  // Skip email when explicitly requested (refresh flow is in-app only)
  if (params.skipEmail) {
    return notificationId;
  }

  const { email, name } = await getUserEmail({
    supabase: params.supabase,
    userId: params.userId,
  });
  const from = getWaitlistEmailFromAddress();
  const appBaseUrl = getAppBaseUrl();
  if (!email || !from) {
    return notificationId;
  }

  const chooseSlotUrl = appBaseUrl ? `${appBaseUrl}${linkPath}` : linkPath;
  const expiryLabel = format(
    parseISO(params.offerExpiresAt),
    "EEE, MMM d 'at' h:mm a",
  );
  const previewList = params.previewSlots
    .map(
      (slot) =>
        `<li><strong>${formatSlotLabel(slot.starts_at)}</strong> with ${slot.specialist_name}</li>`,
    )
    .join("");

  try {
    await sendTransactionalEmail({
      to: email,
      from,
      subject: `Appointment times available for ${params.serviceName}`,
      text: [
        `Hi ${name},`,
        "",
        `Choose a time for ${params.serviceName} at ${params.branchName}.`,
        `Offer expires: ${expiryLabel}`,
        "",
        ...params.previewSlots.map(
          (slot) => `- ${formatSlotLabel(slot.starts_at)} with ${slot.specialist_name}`,
        ),
        "",
        `Choose a slot: ${chooseSlotUrl}`,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
          <p>Hi ${name},</p>
          <p>Choose a time for <strong>${params.serviceName}</strong> at <strong>${params.branchName}</strong>.</p>
          <p><strong>Offer expires:</strong> ${expiryLabel}</p>
          <ul>${previewList}</ul>
          <p><a href="${chooseSlotUrl}">Choose a slot</a></p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send waitlist email:", error);
  }

  return notificationId;
}

async function expireOutstandingArtifacts(supabase: ServiceRoleClient) {
  const nowIso = new Date().toISOString();
  const today = formatDateKey(new Date());

  const { data: expiredGroups } = await supabase
    .from("waitlist_offer_groups")
    .update({ status: "expired" })
    .eq("status", "offered")
    .lt("offer_expires_at", nowIso)
    .select("id,waitlist_request_id");

  const expiredGroupIds = (expiredGroups ?? []).map((group) => group.id);
  if (expiredGroupIds.length > 0) {
    await supabase
      .from("waitlist_slot_offers")
      .update({ status: "expired" })
      .eq("status", "offered")
      .in("offer_group_id", expiredGroupIds);
  }

  for (const group of expiredGroups ?? []) {
    await logWaitlistEvent({
      supabase,
      entityType: "offer_group",
      entityId: group.id,
      eventType: "offer_group.expired",
      payload: { waitlist_request_id: group.waitlist_request_id },
    });
  }

  const { data: expiredRequests } = await supabase
    .from("waitlist_requests")
    .update({ status: "expired" })
    .in("status", ["active", "paused"])
    .lt("date_to", today)
    .select("id");

  for (const request of expiredRequests ?? []) {
    await logWaitlistEvent({
      supabase,
      entityType: "request",
      entityId: request.id,
      eventType: "request.expired",
    });
  }
}

async function getCandidateSpecialists(params: {
  supabase: ServiceRoleClient;
  request: WaitlistRequestRow;
}) {
  // Validate that the service is actually active at this branch 
  // (mimics /api/availability so the dispatcher doesn't fabricate slots the UI hides)
  const { data: branchService } = await params.supabase
    .from("branch_services")
    .select("branch_id")
    .eq("branch_id", params.request.branch_id)
    .eq("service_id", params.request.service_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!branchService) {
    return [];
  }

  const baseQuery = params.supabase
    .from("specialists")
    .select(
      "id,name,title,image_url,branch_id,availability,specialist_services!inner(service_id,is_active)",
    )
    .eq("is_active", true)
    .eq("branch_id", params.request.branch_id)
    .eq("specialist_services.service_id", params.request.service_id)
    .eq("specialist_services.is_active", true);

  const query = params.request.preferred_specialist_id
    ? baseQuery.eq("id", params.request.preferred_specialist_id)
    : baseQuery;

  const { data, error } = await query.order("name", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SpecialistCandidate[];
}

async function collectCandidateSlots(params: {
  supabase: ServiceRoleClient;
  request: WaitlistRequestRow;
  specialists: SpecialistCandidate[];
}) {
  const service = toSingle(params.request.service);
  if (!service) {
    return [];
  }

  // Convert the stored local date strings to UTC bounds using the user's
  // timezone offset — the same way the booking page's /api/availability does it.
  // This ensures the dispatcher scans the exact same UTC window the customer saw.
  const tzOffset = params.request.tz_offset_minutes;
  const { start: rangeStart } = getUtcDayRangeFromOffsetLocal(params.request.date_from, tzOffset);
  const { end: searchEndExclusive } = getUtcDayRangeFromOffsetLocal(params.request.date_to, tzOffset);
  const dispatchNow = new Date(); // pinned once so all date slots are filtered consistently
  const allCandidates: CandidateSlot[] = [];

  // Pre-load previously offered slots for this request (including expired/cancelled).
  // If we try to insert these again, the DB unique constraint (23505) will crash
  // the entire batch, preventing users from receiving multiple distinct offers!
  const { data: previousOffers, error: prevErr } = await params.supabase
    .from("waitlist_slot_offers")
    .select("specialist_id, starts_at")
    .eq("waitlist_request_id", params.request.id);

  if (prevErr) {
    throw new Error(prevErr.message);
  }

  const previouslyOfferedSet = new Set(
    (previousOffers ?? []).map((o) => `${o.specialist_id}:${o.starts_at}`)
  );

  // Build the list of local date strings to iterate (YYYY-MM-DD), same as
  // what the booking page passes to buildAvailableSlotsForDate.
  const localDates: string[] = [];
  {
    const [fromYear, fromMonth, fromDay] = params.request.date_from.split("-").map(Number);
    const [toYear, toMonth, toDay] = params.request.date_to.split("-").map(Number);
    let cur = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
    const end = new Date(Date.UTC(toYear, toMonth - 1, toDay));
    while (cur <= end) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cur.getUTCDate()).padStart(2, "0");
      localDates.push(`${y}-${m}-${d}`);
      cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  for (const specialist of params.specialists) {
    const { data: existingBookings, error } = await params.supabase
      .from("bookings")
      .select("starts_at,ends_at")
      .eq("specialist_id", specialist.id)
      .lt("starts_at", searchEndExclusive.toISOString())
      .gt("ends_at", rangeStart.toISOString())
      .in("status", BLOCKING_BOOKING_STATUSES);

    if (error) {
      throw new Error(error.message);
    }

    for (const localDate of localDates) {
      const slots = buildAvailableSlotsForDate({
        availability: specialist.availability,
        date: localDate,
        bookingDurationMinutes: Number(service.duration_minutes),
        existingBookings: (existingBookings ?? []) as Array<{
          starts_at: string;
          ends_at: string;
        }>,
        tzOffsetMinutes: tzOffset,
        admin: false,
        now: dispatchNow,
      }).filter((slot) => {
        if (!matchesTimeWindow(slot.starts_at, params.request.time_window, tzOffset)) {
          return false;
        }
        // Dedupe previously offered slots right here!
        const isPreviouslyOffered = previouslyOfferedSet.has(`${specialist.id}:${slot.starts_at}`);
        return !isPreviouslyOffered;
      });

      for (const slot of slots) {
        allCandidates.push({
          specialist,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
        });
      }
    }
  }

  return allCandidates.sort((left, right) => {
    if (left.starts_at !== right.starts_at) {
      return left.starts_at.localeCompare(right.starts_at);
    }
    return left.specialist.name.localeCompare(right.specialist.name);
  });
}

// buildShortlist is imported from @/lib/waitlist/dispatcher-logic

async function getConflictingBookingForSlot(params: {
  supabase: ServiceRoleClient;
  specialistId: string;
  startsAt: string;
  endsAt: string;
}) {
  const { data, error } = await params.supabase
    .from("bookings")
    .select("id")
    .eq("specialist_id", params.specialistId)
    .lt("starts_at", params.endsAt)
    .gt("ends_at", params.startsAt)
    .in("status", BLOCKING_BOOKING_STATUSES)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function fetchOfferGroupContext(params: {
  supabase: ServiceRoleClient;
  groupId: string;
}) {
  const { data, error } = await params.supabase
    .from("waitlist_offer_groups")
    .select(
      "id,waitlist_request_id,status,offer_expires_at,dedupe_key,created_at,accepted_at,request:waitlist_requests(id,user_id,status,service_id,branch_id,preferred_specialist_id,date_from,date_to,time_window,service:services(id,name,slug,duration_minutes,min_price_cents,max_price_cents,currency),branch:branches(id,name,city,country,address))",
    )
    .eq("id", params.groupId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as WaitlistOfferGroupContext;
}

async function fetchOfferGroupSlots(params: {
  supabase: ServiceRoleClient;
  groupId: string;
}) {
  const { data, error } = await params.supabase
    .from("waitlist_slot_offers")
    .select(
      "id,offer_group_id,waitlist_request_id,service_id,branch_id,specialist_id,starts_at,ends_at,status,offer_expires_at,accepted_at,specialist:specialists(id,name,title,image_url,branch_id)",
    )
    .eq("offer_group_id", params.groupId)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WaitlistSlotOfferContext[];
}

async function expireOfferGroupIfNeeded(params: {
  supabase: ServiceRoleClient;
  group: WaitlistOfferGroupContext;
}) {
  const now = new Date();
  if (
    params.group.status !== "offered" ||
    isAfter(parseISO(params.group.offer_expires_at), now)
  ) {
    return params.group.status;
  }

  await params.supabase
    .from("waitlist_offer_groups")
    .update({ status: "expired" })
    .eq("id", params.group.id)
    .eq("status", "offered");

  await params.supabase
    .from("waitlist_slot_offers")
    .update({ status: "expired" })
    .eq("offer_group_id", params.group.id)
    .eq("status", "offered");

  await logWaitlistEvent({
    supabase: params.supabase,
    entityType: "offer_group",
    entityId: params.group.id,
    eventType: "offer_group.expired",
    payload: { waitlist_request_id: params.group.waitlist_request_id },
  });

  return "expired" as const;
}

export async function getWaitlistOfferGroupForUser(params: {
  userId: string;
  groupId: string;
  supabase?: ServiceRoleClient;
}) {
  const supabase =
    params.supabase ?? (await createServiceRoleClient("waitlist_dispatch"));
  const group = await fetchOfferGroupContext({
    supabase,
    groupId: params.groupId,
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("[waitlist] offer-group lookup", {
      groupId: params.groupId,
      found: Boolean(group),
    });
  }

  if (!group) {
    throw new WaitlistOfferGroupNotFoundError();
  }

  const request = toSingle(group.request);
  const service = request ? toSingle(request.service) : null;
  const branch = request ? toSingle(request.branch) : null;

  if (process.env.NODE_ENV !== "production") {
    console.info("[waitlist] offer-group ownership", {
      groupId: params.groupId,
      requestFound: Boolean(request),
      ownershipPassed: Boolean(request && request.user_id === params.userId),
    });
  }

  if (!request || request.user_id !== params.userId) {
    throw new WaitlistOfferGroupNotFoundError();
  }

  if (!service || !branch) {
    throw new WaitlistOfferGroupContextError();
  }

  const normalizedStatus = await expireOfferGroupIfNeeded({ supabase, group });
  const slots = await fetchOfferGroupSlots({ supabase, groupId: group.id });

  return {
    group: {
      id: group.id,
      waitlist_request_id: group.waitlist_request_id,
      status: normalizedStatus,
      offer_expires_at: group.offer_expires_at,
      created_at: group.created_at,
      accepted_at: group.accepted_at,
    },
    request: {
      id: request.id,
      status: request.status,
      service_id: request.service_id,
      branch_id: request.branch_id,
      preferred_specialist_id: request.preferred_specialist_id,
      date_from: request.date_from,
      date_to: request.date_to,
      time_window: request.time_window,
    },
    service,
    branch,
    slots: slots.map((slot) => ({
      id: slot.id,
      offer_group_id: slot.offer_group_id,
      waitlist_request_id: slot.waitlist_request_id,
      specialist_id: slot.specialist_id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      status:
        normalizedStatus === "expired" && slot.status === "offered"
          ? "expired"
          : slot.status,
      offer_expires_at: slot.offer_expires_at,
      accepted_at: slot.accepted_at,
      specialist: toSingle(slot.specialist) ?? {
        id: slot.specialist_id,
        name: "Specialist",
        title: "",
        image_url: null,
        branch_id: null,
      },
    })),
  } satisfies WaitlistOfferGroupDetails;
}

export async function selectWaitlistOfferSlotForUser(params: {
  userId: string;
  groupId: string;
  slotId: string;
  supabase?: ServiceRoleClient;
}) {
  const supabase =
    params.supabase ?? (await createServiceRoleClient("waitlist_dispatch"));
  const details = await getWaitlistOfferGroupForUser({
    userId: params.userId,
    groupId: params.groupId,
    supabase,
  });

  if (details.request.status === "cancelled" || details.request.status === "expired") {
    throw new Error("This waitlist request is no longer active.");
  }

  if (details.group.status !== "offered") {
    throw new Error(
      details.group.status === "cancelled"
        ? "That offer is no longer active. Tap 'Check new times' to get fresh options."
        : "This waitlist offer has expired.",
    );
  }

  const slot = details.slots.find((candidate) => candidate.id === params.slotId);
  if (!slot) {
    throw new Error("Slot not found.");
  }

  if (slot.status !== "offered") {
    throw new WaitlistSlotUnavailableError(
      "That slot was just taken. Here are other available options.",
      params.groupId,
      params.slotId,
    );
  }

  const conflictingBooking = await getConflictingBookingForSlot({
    supabase,
    specialistId: slot.specialist_id,
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
  });

  if (conflictingBooking) {
    await supabase
      .from("waitlist_slot_offers")
      .update({ status: "cancelled" })
      .eq("id", slot.id)
      .eq("status", "offered");

    const { count: remainingCount } = await supabase
      .from("waitlist_slot_offers")
      .select("id", { count: "exact", head: true })
      .eq("offer_group_id", params.groupId)
      .eq("status", "offered");

    if ((remainingCount ?? 0) === 0) {
      await supabase
        .from("waitlist_offer_groups")
        .update({ status: "cancelled" })
        .eq("id", params.groupId)
        .eq("status", "offered");
    }

    await logWaitlistEvent({
      supabase,
      entityType: "offer",
      entityId: slot.id,
      eventType: "offer.unavailable",
      payload: {
        waitlist_request_id: details.group.waitlist_request_id,
        offer_group_id: params.groupId,
      },
    });

    throw new WaitlistSlotUnavailableError(
      "That slot was just taken. Here are other available options.",
      params.groupId,
      params.slotId,
    );
  }

  await logWaitlistEvent({
    supabase,
    entityType: "offer_group",
    entityId: params.groupId,
    eventType: "offer_group.slot_selected",
    payload: {
      offer_id: slot.id,
      waitlist_request_id: details.group.waitlist_request_id,
      selected_at: new Date().toISOString(),
    },
  });

  return {
    group: details.group,
    offer: {
      id: slot.id,
      status: slot.status,
      offer_expires_at: slot.offer_expires_at,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
    },
    service: details.service,
    branch: details.branch,
    specialist: slot.specialist,
  } satisfies WaitlistSelectedSlotPrefill;
}

export async function dispatchWaitlistOffers(options?: {
  limit?: number;
  shortlistSize?: number;
  supabase?: ServiceRoleClient;
  requestId?: string;
}) {
  const supabase =
    options?.supabase ?? (await createServiceRoleClient("waitlist_dispatch"));
  const now = new Date();
  const nowIso = now.toISOString();
  const today = formatDateKey(now);
  const limit = options?.limit ?? WAITLIST_DISPATCH_BATCH_SIZE;
  const shortlistSize = Math.min(
    Math.max(options?.shortlistSize ?? WAITLIST_DEFAULT_SHORTLIST_SIZE, 3),
    6,
  );

  await expireOutstandingArtifacts(supabase);

  let requestsQuery = supabase
    .from("waitlist_requests")
    .select(
      "id,user_id,service_id,branch_id,preferred_specialist_id,date_from,date_to,time_window,status,cooldown_until,tz_offset_minutes,service:services(id,name,slug,duration_minutes,min_price_cents,max_price_cents,currency),branch:branches(id,name,city,country,address)",
    )
    .eq("status", "active")
    .gte("date_to", today)
    .or(`cooldown_until.is.null,cooldown_until.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (options?.requestId) {
    requestsQuery = requestsQuery.eq("id", options.requestId);
  }

  const { data: requests, error } = await requestsQuery;

  if (error) {
    throw new Error(error.message);
  }

  let offeredCount = 0;
  let skippedExistingOfferCount = 0;
  let skippedNoSpecialistsCount = 0;
  let skippedNoSlotsCount = 0;
  let invariantViolationCount = 0;

  for (const request of (requests ?? []) as WaitlistRequestRow[]) {
    const { data: existingGroup } = await supabase
      .from("waitlist_offer_groups")
      .select("id")
      .eq("waitlist_request_id", request.id)
      .eq("status", "offered")
      .gt("offer_expires_at", nowIso)
      .limit(1)
      .maybeSingle();

    if (existingGroup) {
      skippedExistingOfferCount += 1;
      continue;
    }

    const specialists = await getCandidateSpecialists({ supabase, request });
    if (specialists.length === 0) {
      skippedNoSpecialistsCount += 1;
      continue;
    }

    const candidates = await collectCandidateSlots({
      supabase,
      request,
      specialists,
    });

    // Compute the UTC boundaries for invariant checks (same math as collectCandidateSlots)
    const tzOffset = request.tz_offset_minutes;
    const { start: invRangeStart } = getUtcDayRangeFromOffsetLocal(request.date_from, tzOffset);
    const { end: invRangeEnd } = getUtcDayRangeFromOffsetLocal(request.date_to, tzOffset);

    // Run hard invariant assertions on every candidate before shortlisting
    const validatedCandidates = candidates.filter((slot) => {
      const passes = assertSlotInvariants({
        slot,
        rangeStartUtc: invRangeStart,
        rangeEndUtc: invRangeEnd,
        timeWindow: request.time_window,
        tzOffsetMinutes: tzOffset,
        requestId: request.id,
      });
      if (!passes) invariantViolationCount += 1;
      return passes;
    });

    const shortlist = buildShortlist(validatedCandidates, shortlistSize);
    if (shortlist.length === 0) {
      skippedNoSlotsCount += 1;

      // Structured debug log when no slots survive filtering
      console.info("[waitlist:dispatch] no valid slots", {
        request_id: request.id,
        date_from: request.date_from,
        date_to: request.date_to,
        time_window: request.time_window,
        tz_offset_minutes: tzOffset,
        range_start_utc: invRangeStart.toISOString(),
        range_end_utc: invRangeEnd.toISOString(),
        raw_candidates_count: candidates.length,
        validated_candidates_count: validatedCandidates.length,
      });
      continue;
    }

    // Per-request observability
    console.info("[waitlist:dispatch] generating offers", {
      request_id: request.id,
      date_from: request.date_from,
      date_to: request.date_to,
      time_window: request.time_window,
      tz_offset_minutes: tzOffset,
      range_start_utc: invRangeStart.toISOString(),
      range_end_utc: invRangeEnd.toISOString(),
      engine_slots_count: candidates.length,
      validated_slots_count: validatedCandidates.length,
      shortlist_count: shortlist.length,
      selected_slots: shortlist.slice(0, 3).map((s) => ({
        specialist_id: s.specialist.id,
        starts_at: s.starts_at,
      })),
    });

    const offerExpiresAt = addMinutes(
      now,
      WAITLIST_DEFAULT_OFFER_WINDOW_MINUTES,
    ).toISOString();
    const cooldownUntil = addMinutes(
      now,
      WAITLIST_DEFAULT_COOLDOWN_MINUTES,
    ).toISOString();
    const service = toSingle(request.service);
    const branch = toSingle(request.branch);
    const dedupeKey = `wlgrp:${request.id}:${now.getTime()}:${shortlist[0]?.starts_at ?? nowIso}`;

    const { data: group, error: groupError } = await supabase
      .from("waitlist_offer_groups")
      .insert({
        waitlist_request_id: request.id,
        status: "offered",
        offer_expires_at: offerExpiresAt,
        dedupe_key: dedupeKey,
      })
      .select("id")
      .maybeSingle();

    if (groupError) {
      if (groupError.code === "23505") {
        continue;
      }
      throw new Error(groupError.message);
    }

    if (!group?.id) {
      continue;
    }

    const slotRows = shortlist.map((slot) => ({
      offer_group_id: group.id,
      waitlist_request_id: request.id,
      service_id: request.service_id,
      branch_id: request.branch_id,
      specialist_id: slot.specialist.id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      offer_expires_at: offerExpiresAt,
      dedupe_key: `wlslot:${request.id}:${slot.specialist.id}:${slot.starts_at}`,
    }));

    const { data: insertedSlots, error: slotError } = await supabase
      .from("waitlist_slot_offers")
      .insert(slotRows)
      .select("id,specialist_id,starts_at,ends_at");

    if (slotError) {
      await supabase
        .from("waitlist_offer_groups")
        .update({ status: "cancelled" })
        .eq("id", group.id);
      if (slotError.code === "23505") {
        continue;
      }
      throw new Error(slotError.message);
    }

    await supabase
      .from("waitlist_requests")
      .update({ cooldown_until: cooldownUntil })
      .eq("id", request.id);

    await logWaitlistEvent({
      supabase,
      entityType: "offer_group",
      entityId: group.id,
      eventType: "offer_group.created",
      payload: {
        waitlist_request_id: request.id,
        offer_expires_at: offerExpiresAt,
        slot_count: insertedSlots?.length ?? 0,
      },
    });

    for (const slot of insertedSlots ?? []) {
      await logWaitlistEvent({
        supabase,
        entityType: "offer",
        entityId: slot.id,
        eventType: "offer.created",
        payload: {
          waitlist_request_id: request.id,
          offer_group_id: group.id,
          specialist_id: slot.specialist_id,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          offer_expires_at: offerExpiresAt,
        },
      });
    }

    await notifyOfferGroup({
      supabase,
      userId: request.user_id,
      groupId: group.id,
      serviceName: service?.name ?? "Service",
      branchName: branch?.name ?? "Branch",
      offerExpiresAt,
      previewSlots: mapPreviewSlots(shortlist),
      // Standard dispatch sends email; refresh flow uses skipEmail=true
      skipEmail: false,
    });

    offeredCount += 1;
  }

  return {
    scanned_count: requests?.length ?? 0,
    offered_count: offeredCount,
    skipped_existing_offer_count: skippedExistingOfferCount,
    skipped_no_specialists_count: skippedNoSpecialistsCount,
    skipped_no_slots_count: skippedNoSlotsCount,
    invariant_violation_count: invariantViolationCount,
    batch_limit: limit,
    shortlist_size: shortlistSize,
    ran_at: nowIso,
  };
}

export async function acceptWaitlistOfferForUser(params: {
  userId: string;
  offerId: string;
  supabase?: ServiceRoleClient;
}) {
  const supabase =
    params.supabase ?? (await createServiceRoleClient("waitlist_dispatch"));
  const { data, error } = await supabase
    .from("waitlist_slot_offers")
    .select("id,offer_group_id")
    .eq("id", params.offerId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Offer not found.");
  }

  return selectWaitlistOfferSlotForUser({
    userId: params.userId,
    groupId: data.offer_group_id,
    slotId: data.id,
    supabase,
  });
}

export async function fulfillWaitlistOfferAfterBooking(params: {
  userId: string;
  offerId: string;
  offerGroupId?: string | null;
  bookingId: string;
  serviceId: string;
  branchId: string;
  specialistId: string;
  startsAt: string;
  supabase?: ServiceRoleClient;
}) {
  const supabase =
    params.supabase ?? (await createServiceRoleClient("waitlist_dispatch"));
  const { data, error } = await supabase
    .from("waitlist_slot_offers")
    .select(
      "id,offer_group_id,waitlist_request_id,status,offer_expires_at,accepted_at,service_id,branch_id,specialist_id,starts_at,group:waitlist_offer_groups(id,status,offer_expires_at),request:waitlist_requests(id,user_id)",
    )
    .eq("id", params.offerId)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  const request = toSingle(
    data.request as { id: string; user_id: string } | { id: string; user_id: string }[] | null,
  );
  const group = toSingle(
    data.group as { id: string; status: string; offer_expires_at: string } | { id: string; status: string; offer_expires_at: string }[] | null,
  );
  if (!request || request.user_id !== params.userId || !group) {
    return;
  }

  if (params.offerGroupId && data.offer_group_id !== params.offerGroupId) {
    return;
  }

  const slotMatches =
    data.service_id === params.serviceId &&
    data.branch_id === params.branchId &&
    data.specialist_id === params.specialistId &&
    data.starts_at === params.startsAt;

  if (!slotMatches) {
    return;
  }

  const groupActive =
    group.status === "accepted" ||
    (group.status === "offered" &&
      isAfter(parseISO(group.offer_expires_at), new Date()));

  if (!groupActive) {
    return;
  }

  await supabase
    .from("waitlist_slot_offers")
    .update({
      status: "accepted",
      accepted_at: data.accepted_at ?? new Date().toISOString(),
    })
    .eq("id", params.offerId);

  await supabase
    .from("waitlist_offer_groups")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", data.offer_group_id);

  await supabase
    .from("waitlist_requests")
    .update({
      status: "fulfilled",
      cooldown_until: null,
    })
    .eq("id", data.waitlist_request_id);

  await supabase
    .from("waitlist_slot_offers")
    .update({ status: "cancelled" })
    .eq("offer_group_id", data.offer_group_id)
    .eq("status", "offered")
    .neq("id", params.offerId);

  const { data: siblingGroups } = await supabase
    .from("waitlist_offer_groups")
    .select("id")
    .eq("waitlist_request_id", data.waitlist_request_id)
    .eq("status", "offered")
    .neq("id", data.offer_group_id);

  const siblingGroupIds = (siblingGroups ?? []).map((item) => item.id);
  if (siblingGroupIds.length > 0) {
    await supabase
      .from("waitlist_offer_groups")
      .update({ status: "cancelled" })
      .in("id", siblingGroupIds);

    await supabase
      .from("waitlist_slot_offers")
      .update({ status: "cancelled" })
      .in("offer_group_id", siblingGroupIds)
      .eq("status", "offered");
  }

  await logWaitlistEvent({
    supabase,
    entityType: "offer_group",
    entityId: data.offer_group_id,
    eventType: "offer_group.accepted",
    payload: {
      booking_id: params.bookingId,
      offer_id: params.offerId,
      waitlist_request_id: data.waitlist_request_id,
    },
  });

  await logWaitlistEvent({
    supabase,
    entityType: "request",
    entityId: data.waitlist_request_id,
    eventType: "request.fulfilled",
    payload: {
      booking_id: params.bookingId,
      offer_id: params.offerId,
      offer_group_id: data.offer_group_id,
    },
  });
}

export function isWaitlistSlotUnavailableError(error: unknown) {
  return error instanceof WaitlistSlotUnavailableError;
}

export function getWaitlistSlotUnavailableRedirect(error: unknown) {
  if (!(error instanceof WaitlistSlotUnavailableError)) {
    return null;
  }

  return `${buildWaitlistOfferGroupPath(error.groupId)}?failed_slot=${encodeURIComponent(error.slotId)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// refreshWaitlistRequest
// Atomically invalidates existing active offer groups and generates a fresh
// one aligned to (optionally updated) preferences. Creates a NEW in-app
// notification pointing to the new group. No email is sent.
// ─────────────────────────────────────────────────────────────────────────────

export type RefreshWaitlistResult = {
  /** The new offer group id, or null if no slots were found. */
  offer_group_id: string | null;
  /** The new notification id, or null if no group was created. */
  notification_id: string | null;
  /** How many slots are in the new offer group. */
  slot_count: number;
  /** ISO timestamp when the new offer expires, or null. */
  offer_expires_at: string | null;
  /** Reason the refresh produced no group (for client messaging). */
  no_slots_reason?: "no_specialists" | "no_slots" | "request_inactive";
};

export async function refreshWaitlistRequest(params: {
  userId: string;
  requestId: string;
  /** Optional preference overrides to apply before generating new offers. */
  preferences?: {
    date_from?: string;
    date_to?: string;
    time_window?: "morning" | "afternoon" | "evening" | null;
    preferred_specialist_id?: string | null;
  };
  cancelledReason?: "preferences_changed" | "rejoin";
  supabase?: ServiceRoleClient;
}): Promise<RefreshWaitlistResult> {
  const supabase =
    params.supabase ?? (await createServiceRoleClient("waitlist_dispatch"));
  const now = new Date();
  const nowIso = now.toISOString();
  const cancelledReason = params.cancelledReason ?? "rejoin";

  // ── A) Validate auth and ownership ──────────────────────────────────────
  const { data: requestRow, error: requestError } = await supabase
    .from("waitlist_requests")
    .select(
      "id,user_id,service_id,branch_id,preferred_specialist_id,date_from,date_to,time_window,status,cooldown_until,tz_offset_minutes,refresh_in_progress_until,service:services(id,name,slug,duration_minutes,min_price_cents,max_price_cents,currency),branch:branches(id,name,city,country,address)",
    )
    .eq("id", params.requestId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw new Error("Waitlist request not found.");
  }

  if (requestRow.status !== "active") {
    return {
      offer_group_id: null,
      notification_id: null,
      slot_count: 0,
      offer_expires_at: null,
      no_slots_reason: "request_inactive",
    };
  }

  // ── Idempotency: short-lived request lock (10 s) ─────────────────────────
  // If a refresh is already in progress for this request, return early.
  const lockUntil = requestRow.refresh_in_progress_until as string | null;
  if (lockUntil && new Date(lockUntil).getTime() > now.getTime()) {
    // A refresh is already running — find the most recent active group and
    // return it so the UI can redirect immediately.
    const { data: existingGroup } = await supabase
      .from("waitlist_offer_groups")
      .select("id,offer_expires_at")
      .eq("waitlist_request_id", params.requestId)
      .eq("status", "offered")
      .gt("offer_expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingGroup) {
      // Find the notification for this group
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", params.userId)
        .eq("dedupe_key", `waitlist_offer_group:${existingGroup.id}:user:${params.userId}`)
        .limit(1)
        .maybeSingle();

      const { count: slotCount } = await supabase
        .from("waitlist_slot_offers")
        .select("id", { count: "exact", head: true })
        .eq("offer_group_id", existingGroup.id)
        .eq("status", "offered");

      return {
        offer_group_id: existingGroup.id,
        notification_id: existingNotif?.id ?? null,
        slot_count: slotCount ?? 0,
        offer_expires_at: existingGroup.offer_expires_at,
      };
    }

    return {
      offer_group_id: null,
      notification_id: null,
      slot_count: 0,
      offer_expires_at: null,
    };
  }

  // Acquire the lock (10 s window)
  await supabase
    .from("waitlist_requests")
    .update({ refresh_in_progress_until: addMinutes(now, 0.167).toISOString() }) // ~10 s
    .eq("id", params.requestId);

  try {
    // ── B) Apply preference updates if provided ──────────────────────────
    const prefs = params.preferences;
    if (prefs && Object.keys(prefs).length > 0) {
      const prefUpdate: Record<string, unknown> = {
        cooldown_until: null,
        updated_at: nowIso,
      };
      if (prefs.date_from !== undefined) prefUpdate.date_from = prefs.date_from;
      if (prefs.date_to !== undefined) prefUpdate.date_to = prefs.date_to;
      if (prefs.time_window !== undefined) prefUpdate.time_window = prefs.time_window;
      if (prefs.preferred_specialist_id !== undefined)
        prefUpdate.preferred_specialist_id = prefs.preferred_specialist_id;

      await supabase
        .from("waitlist_requests")
        .update(prefUpdate)
        .eq("id", params.requestId);
    } else {
      // Always clear cooldown so the request is eligible for immediate dispatch
      await supabase
        .from("waitlist_requests")
        .update({ cooldown_until: null, updated_at: nowIso })
        .eq("id", params.requestId);
    }

    // ── C) Invalidate existing active offer groups ───────────────────────
    const cancelledAt = nowIso;
    const { data: cancelledGroups } = await supabase
      .from("waitlist_offer_groups")
      .update({
        status: "cancelled",
        cancelled_reason: cancelledReason,
        cancelled_at: cancelledAt,
      })
      .eq("waitlist_request_id", params.requestId)
      .eq("status", "offered")
      .select("id");

    const cancelledGroupIds = (cancelledGroups ?? []).map((g) => g.id);
    if (cancelledGroupIds.length > 0) {
      await supabase
        .from("waitlist_slot_offers")
        .update({
          status: "cancelled",
          cancelled_reason: cancelledReason,
          cancelled_at: cancelledAt,
        })
        .in("offer_group_id", cancelledGroupIds)
        .eq("status", "offered");

      for (const groupId of cancelledGroupIds) {
        await logWaitlistEvent({
          supabase,
          entityType: "offer_group",
          entityId: groupId,
          eventType: "offer_group.cancelled",
          payload: {
            waitlist_request_id: params.requestId,
            cancelled_reason: cancelledReason,
          },
        });
      }
    }

    await logWaitlistEvent({
      supabase,
      entityType: "request",
      entityId: params.requestId,
      eventType: "request.refreshed",
      payload: {
        cancelled_reason: cancelledReason,
        preferences: prefs ?? {},
        cancelled_group_count: cancelledGroupIds.length,
      },
    });

    // ── D) Re-fetch the request with updated preferences ─────────────────
    const { data: freshRequest } = await supabase
      .from("waitlist_requests")
      .select(
        "id,user_id,service_id,branch_id,preferred_specialist_id,date_from,date_to,time_window,status,cooldown_until,tz_offset_minutes,service:services(id,name,slug,duration_minutes,min_price_cents,max_price_cents,currency),branch:branches(id,name,city,country,address)",
      )
      .eq("id", params.requestId)
      .maybeSingle();

    if (!freshRequest) {
      throw new Error("Failed to re-fetch waitlist request after update.");
    }

    const typedRequest = freshRequest as WaitlistRequestRow;
    const service = toSingle(typedRequest.service);
    const branch = toSingle(typedRequest.branch);

    // ── E) Generate fresh shortlist ──────────────────────────────────────
    const shortlistSize = Math.min(
      Math.max(WAITLIST_DEFAULT_SHORTLIST_SIZE, 3),
      6,
    );

    const specialists = await getCandidateSpecialists({
      supabase,
      request: typedRequest,
    });

    if (specialists.length === 0) {
      return {
        offer_group_id: null,
        notification_id: null,
        slot_count: 0,
        offer_expires_at: null,
        no_slots_reason: "no_specialists",
      };
    }

    const tzOffset = typedRequest.tz_offset_minutes;
    const { start: invRangeStart } = getUtcDayRangeFromOffsetLocal(typedRequest.date_from, tzOffset);
    const { end: invRangeEnd } = getUtcDayRangeFromOffsetLocal(typedRequest.date_to, tzOffset);

    // For the refresh flow we want to allow previously-offered slots to be
    // re-offered (the old group was just cancelled, so those slots are free).
    // We achieve this by NOT pre-loading the cancelled slots from the old group.
    // We still dedupe against any currently-active (non-cancelled) slot offers
    // to avoid conflicts with other live groups.
    const candidates = await collectCandidateSlotsForRefresh({
      supabase,
      request: typedRequest,
      specialists,
      cancelledGroupIds,
    });

    const validatedCandidates = candidates.filter((slot) =>
      assertSlotInvariants({
        slot,
        rangeStartUtc: invRangeStart,
        rangeEndUtc: invRangeEnd,
        timeWindow: typedRequest.time_window,
        tzOffsetMinutes: tzOffset,
        requestId: params.requestId,
      }),
    );

    const shortlist = buildShortlist(validatedCandidates, shortlistSize);

    if (shortlist.length === 0) {
      return {
        offer_group_id: null,
        notification_id: null,
        slot_count: 0,
        offer_expires_at: null,
        no_slots_reason: "no_slots",
      };
    }

    // ── F) Create new offer group ────────────────────────────────────────
    const offerExpiresAt = addMinutes(now, WAITLIST_DEFAULT_OFFER_WINDOW_MINUTES).toISOString();
    const cooldownUntil = addMinutes(now, WAITLIST_DEFAULT_COOLDOWN_MINUTES).toISOString();

    // Dedupe key uses prefs hash + 30-second bucket to prevent duplicates on
    // rapid clicks while still allowing a new group after the bucket rolls.
    const prefsHash = [
      typedRequest.service_id,
      typedRequest.branch_id,
      typedRequest.date_from,
      typedRequest.date_to,
      typedRequest.time_window ?? "any",
      typedRequest.preferred_specialist_id ?? "any",
    ].join(":");
    const bucket = Math.floor(now.getTime() / 30_000);
    const groupDedupeKey = `wlgrp_refresh:${params.requestId}:${prefsHash}:${bucket}`;

    // Check if a group with this dedupe key already exists (rapid-click guard)
    const { data: existingDeduped } = await supabase
      .from("waitlist_offer_groups")
      .select("id,offer_expires_at")
      .eq("dedupe_key", groupDedupeKey)
      .maybeSingle();

    if (existingDeduped) {
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", params.userId)
        .eq("dedupe_key", `waitlist_offer_group:${existingDeduped.id}:user:${params.userId}`)
        .limit(1)
        .maybeSingle();

      const { count: slotCount } = await supabase
        .from("waitlist_slot_offers")
        .select("id", { count: "exact", head: true })
        .eq("offer_group_id", existingDeduped.id)
        .eq("status", "offered");

      return {
        offer_group_id: existingDeduped.id,
        notification_id: existingNotif?.id ?? null,
        slot_count: slotCount ?? 0,
        offer_expires_at: existingDeduped.offer_expires_at,
      };
    }

    const { data: newGroup, error: groupError } = await supabase
      .from("waitlist_offer_groups")
      .insert({
        waitlist_request_id: params.requestId,
        status: "offered",
        offer_expires_at: offerExpiresAt,
        dedupe_key: groupDedupeKey,
      })
      .select("id")
      .maybeSingle();

    if (groupError) {
      if (groupError.code === "23505") {
        // Race condition — another request created the same group; find it
        const { data: raceGroup } = await supabase
          .from("waitlist_offer_groups")
          .select("id,offer_expires_at")
          .eq("dedupe_key", groupDedupeKey)
          .maybeSingle();
        if (raceGroup) {
          const { data: raceNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", params.userId)
            .eq("dedupe_key", `waitlist_offer_group:${raceGroup.id}:user:${params.userId}`)
            .limit(1)
            .maybeSingle();
          return {
            offer_group_id: raceGroup.id,
            notification_id: raceNotif?.id ?? null,
            slot_count: shortlist.length,
            offer_expires_at: raceGroup.offer_expires_at,
          };
        }
      }
      throw new Error(groupError.message);
    }

    if (!newGroup?.id) {
      throw new Error("Failed to create offer group.");
    }

    // ── G) Insert slot offers ────────────────────────────────────────────
    const slotRows = shortlist.map((slot) => ({
      offer_group_id: newGroup.id,
      waitlist_request_id: params.requestId,
      service_id: typedRequest.service_id,
      branch_id: typedRequest.branch_id,
      specialist_id: slot.specialist.id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      offer_expires_at: offerExpiresAt,
      // Use a refresh-specific dedupe key so these don't collide with the
      // previously-cancelled slots (which had the same specialist+starts_at).
      dedupe_key: `wlslot_r:${params.requestId}:${slot.specialist.id}:${slot.starts_at}:${bucket}`,
    }));

    const { data: insertedSlots, error: slotError } = await supabase
      .from("waitlist_slot_offers")
      .insert(slotRows)
      .select("id,specialist_id,starts_at,ends_at");

    if (slotError) {
      await supabase
        .from("waitlist_offer_groups")
        .update({ status: "cancelled" })
        .eq("id", newGroup.id);
      throw new Error(slotError.message);
    }

    // Set cooldown so the cron dispatcher doesn't immediately re-offer
    await supabase
      .from("waitlist_requests")
      .update({ cooldown_until: cooldownUntil })
      .eq("id", params.requestId);

    await logWaitlistEvent({
      supabase,
      entityType: "offer_group",
      entityId: newGroup.id,
      eventType: "offer_group.created",
      payload: {
        waitlist_request_id: params.requestId,
        offer_expires_at: offerExpiresAt,
        slot_count: insertedSlots?.length ?? 0,
        source: "refresh",
      },
    });

    // ── H) Create NEW in-app notification (no email) ─────────────────────
    const notificationId = await notifyOfferGroup({
      supabase,
      userId: params.userId,
      groupId: newGroup.id,
      serviceName: service?.name ?? "Service",
      branchName: branch?.name ?? "Branch",
      offerExpiresAt,
      previewSlots: mapPreviewSlots(shortlist),
      skipEmail: true, // refresh flow is in-app only
    });

    return {
      offer_group_id: newGroup.id,
      notification_id: notificationId,
      slot_count: insertedSlots?.length ?? 0,
      offer_expires_at: offerExpiresAt,
    };
  } finally {
    // Always release the lock
    await supabase
      .from("waitlist_requests")
      .update({ refresh_in_progress_until: null })
      .eq("id", params.requestId);
  }
}

/**
 * Like collectCandidateSlots but skips deduplication against the just-cancelled
 * groups so those slots can be re-offered in the new group.
 */
async function collectCandidateSlotsForRefresh(params: {
  supabase: ServiceRoleClient;
  request: WaitlistRequestRow;
  specialists: SpecialistCandidate[];
  /** Group ids that were just cancelled — their slots should be re-eligible. */
  cancelledGroupIds: string[];
}) {
  const service = toSingle(params.request.service);
  if (!service) {
    return [];
  }

  const tzOffset = params.request.tz_offset_minutes;
  const { start: rangeStart } = getUtcDayRangeFromOffsetLocal(params.request.date_from, tzOffset);
  const { end: searchEndExclusive } = getUtcDayRangeFromOffsetLocal(params.request.date_to, tzOffset);
  const dispatchNow = new Date();
  const allCandidates: CandidateSlot[] = [];

  // Pre-load previously offered slots EXCLUDING the just-cancelled groups so
  // those slots are eligible again.
  let prevOffersQuery = params.supabase
    .from("waitlist_slot_offers")
    .select("specialist_id, starts_at, offer_group_id")
    .eq("waitlist_request_id", params.request.id);

  if (params.cancelledGroupIds.length > 0) {
    prevOffersQuery = prevOffersQuery.not(
      "offer_group_id",
      "in",
      `(${params.cancelledGroupIds.join(",")})`,
    );
  }

  const { data: previousOffers, error: prevErr } = await prevOffersQuery;
  if (prevErr) {
    throw new Error(prevErr.message);
  }

  const previouslyOfferedSet = new Set(
    (previousOffers ?? []).map((o) => `${o.specialist_id}:${o.starts_at}`),
  );

  const localDates: string[] = [];
  {
    const [fromYear, fromMonth, fromDay] = params.request.date_from.split("-").map(Number);
    const [toYear, toMonth, toDay] = params.request.date_to.split("-").map(Number);
    let cur = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
    const end = new Date(Date.UTC(toYear, toMonth - 1, toDay));
    while (cur <= end) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cur.getUTCDate()).padStart(2, "0");
      localDates.push(`${y}-${m}-${d}`);
      cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  for (const specialist of params.specialists) {
    const { data: existingBookings, error } = await params.supabase
      .from("bookings")
      .select("starts_at,ends_at")
      .eq("specialist_id", specialist.id)
      .lt("starts_at", searchEndExclusive.toISOString())
      .gt("ends_at", rangeStart.toISOString())
      .in("status", BLOCKING_BOOKING_STATUSES);

    if (error) {
      throw new Error(error.message);
    }

    for (const localDate of localDates) {
      const slots = buildAvailableSlotsForDate({
        availability: specialist.availability,
        date: localDate,
        bookingDurationMinutes: Number(service.duration_minutes),
        existingBookings: (existingBookings ?? []) as Array<{
          starts_at: string;
          ends_at: string;
        }>,
        tzOffsetMinutes: tzOffset,
        admin: false,
        now: dispatchNow,
      }).filter((slot) => {
        if (!matchesTimeWindow(slot.starts_at, params.request.time_window, tzOffset)) {
          return false;
        }
        return !previouslyOfferedSet.has(`${specialist.id}:${slot.starts_at}`);
      });

      for (const slot of slots) {
        allCandidates.push({
          specialist,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
        });
      }
    }
  }

  return allCandidates.sort((left, right) => {
    if (left.starts_at !== right.starts_at) {
      return left.starts_at.localeCompare(right.starts_at);
    }
    return left.specialist.name.localeCompare(right.specialist.name);
  });
}

export function getDefaultWaitlistDateRange(rangeDays: number) {
  const from = new Date();
  const to = addDays(from, Math.max(rangeDays - 1, 0));
  return {
    date_from: formatDateKey(from),
    date_to: formatDateKey(to),
  };
}
