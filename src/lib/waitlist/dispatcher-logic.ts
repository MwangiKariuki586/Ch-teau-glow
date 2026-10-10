/**
 * Pure, testable dispatcher logic — extracted from server.ts so it can be
 * imported without the "server-only" guard.
 */

import { parseISO } from "date-fns";
import {
  TIME_WINDOW_HOURS,
  type WaitlistTimeWindow,
} from "@/lib/waitlist/config";

// ────────────────────────────────────────────
// Types (mirrored from server.ts for decoupling)
// ────────────────────────────────────────────

/** Minimal specialist shape needed by shortlist / invariant helpers. */
export type DispatchSpecialist = {
  id: string;
  name: string;
  title: string;
  image_url: string | null;
  branch_id: string | null;
};

/** A candidate slot considered for offering. */
export type DispatchCandidateSlot = {
  specialist: DispatchSpecialist;
  starts_at: string;
  ends_at: string;
};

// ────────────────────────────────────────────
// matchesTimeWindow
// ────────────────────────────────────────────

/**
 * Check whether a slot's local-time hour falls within the requested window.
 * Uses the user's tz_offset_minutes to derive the local hour.
 *
 * tzOffsetMinutes follows JS convention: UTC = local + offset,
 * so local = UTC - offset.
 */
export function matchesTimeWindow(
  startsAt: string,
  timeWindow: WaitlistTimeWindow | null,
  tzOffsetMinutes: number,
): boolean {
  if (!timeWindow) return true;

  const utcMs = parseISO(startsAt).getTime();
  const localMs = utcMs - tzOffsetMinutes * 60_000;
  const localHour = new Date(localMs).getUTCHours();
  const bounds = TIME_WINDOW_HOURS[timeWindow];
  return localHour >= bounds.start && localHour < bounds.end;
}

// ────────────────────────────────────────────
// assertSlotInvariants
// ────────────────────────────────────────────

/**
 * Hard invariant check — prevents any slot outside the user's selected
 * date-range or time-window from becoming an offer.
 * Returns true if the slot passes all checks.
 */
export function assertSlotInvariants(params: {
  slot: DispatchCandidateSlot;
  rangeStartUtc: Date;
  rangeEndUtc: Date;
  timeWindow: WaitlistTimeWindow | null;
  tzOffsetMinutes: number;
  requestId: string;
}): boolean {
  const startsAt = parseISO(params.slot.starts_at);

  if (startsAt < params.rangeStartUtc) {
    console.error("[waitlist:invariant] slot before range_start", {
      request_id: params.requestId,
      starts_at: params.slot.starts_at,
      range_start_utc: params.rangeStartUtc.toISOString(),
    });
    return false;
  }

  if (startsAt > params.rangeEndUtc) {
    console.error("[waitlist:invariant] slot after range_end", {
      request_id: params.requestId,
      starts_at: params.slot.starts_at,
      range_end_utc: params.rangeEndUtc.toISOString(),
    });
    return false;
  }

  if (!matchesTimeWindow(params.slot.starts_at, params.timeWindow, params.tzOffsetMinutes)) {
    console.error("[waitlist:invariant] slot outside time_window", {
      request_id: params.requestId,
      starts_at: params.slot.starts_at,
      time_window: params.timeWindow,
      tz_offset_minutes: params.tzOffsetMinutes,
    });
    return false;
  }

  return true;
}

// ────────────────────────────────────────────
// buildShortlist
// ────────────────────────────────────────────

/**
 * Pick up to `limit` slots from candidates, diversifying across specialists.
 * First takes the earliest slot from each specialist, then fills remaining
 * capacity with the next-soonest slots regardless of specialist.
 */
export function buildShortlist(
  candidates: DispatchCandidateSlot[],
  limit: number,
): DispatchCandidateSlot[] {
  const shortlist: DispatchCandidateSlot[] = [];
  const perSpecialist = new Map<string, DispatchCandidateSlot[]>();

  for (const candidate of candidates) {
    const specialistSlots = perSpecialist.get(candidate.specialist.id) ?? [];
    specialistSlots.push(candidate);
    perSpecialist.set(candidate.specialist.id, specialistSlots);
  }

  // One slot per specialist first (earliest for each)
  for (const [, specialistSlots] of perSpecialist) {
    const first = specialistSlots.shift();
    if (first) {
      shortlist.push(first);
    }
  }

  shortlist.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Fill remaining capacity
  if (shortlist.length < limit) {
    const remainder = Array.from(perSpecialist.values())
      .flat()
      .sort((a, b) => {
        if (a.starts_at !== b.starts_at) {
          return a.starts_at.localeCompare(b.starts_at);
        }
        return a.specialist.name.localeCompare(b.specialist.name);
      });

    for (const candidate of remainder) {
      if (shortlist.length >= limit) break;
      shortlist.push(candidate);
    }
  }

  return shortlist
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, limit);
}
