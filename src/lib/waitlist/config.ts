export const WAITLIST_DEFAULT_RANGE_DAYS = 7;
export const WAITLIST_ALLOWED_RANGE_DAYS = [7, 14, 30] as const;
export const WAITLIST_DEFAULT_OFFER_WINDOW_MINUTES = Number(
  process.env.OFFER_WINDOW_MINUTES ?? "10",
);
export const WAITLIST_DEFAULT_COOLDOWN_MINUTES = Number(
  process.env.COOLDOWN_MINUTES ?? "60",
);
export const WAITLIST_DISPATCH_BATCH_SIZE = Number(
  process.env.WAITLIST_DISPATCH_BATCH_SIZE ?? "50",
);
export const WAITLIST_DEFAULT_SHORTLIST_SIZE = Number(
  process.env.WAITLIST_SHORTLIST_SIZE ?? "5",
);

export type WaitlistTimeWindow = "morning" | "afternoon" | "evening";

/**
 * Canonical hour boundaries for each time-window preference.
 * Hours are in the user's local timezone (derived from tz_offset_minutes).
 * start is inclusive, end is exclusive.
 */
export const TIME_WINDOW_HOURS: Record<
  WaitlistTimeWindow,
  { start: number; end: number }
> = {
  morning: { start: 8, end: 12 },
  afternoon: { start: 12, end: 17 },
  evening: { start: 17, end: 21 },
} as const;

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    ""
  );
}

export function getWaitlistEmailFromAddress() {
  const candidate =
    process.env.WAITLIST_FROM_EMAIL ??
    process.env.RESEND_FROM_EMAIL ??
    process.env.AFTERCARE_FROM_EMAIL;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
}
