"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { AlertCircle, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WaitlistOfferGroupResponse = {
  data: {
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
};

type RefreshResponse = {
  data: {
    offer_group_id: string | null;
    notification_id: string | null;
    slot_count: number;
    offer_expires_at: string | null;
    no_slots_reason?: "no_specialists" | "no_slots" | "request_inactive";
  };
  error?: string;
};

type SpecialistOption = {
  id: string;
  name: string;
  title: string;
};

const EXPIRY_GRACE_MS = 10_000;

type OfferAvailabilityState =
  | "loading"
  | "active"
  | "expired"
  | "taken"
  | "not_found"
  | "unverifiable";

function parseExpiresAtMs(value: string | null | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function extractOfferGroupId(params: {
  offerGroupId?: string | null;
  linkUrl?: string | null;
}) {
  if (params.offerGroupId?.trim()) {
    return params.offerGroupId.trim();
  }

  if (!params.linkUrl) {
    return null;
  }

  const groupPathMatch = params.linkUrl.match(/\/waitlist\/offers\/([^/?#]+)/i);
  if (groupPathMatch?.[1]) {
    return decodeURIComponent(groupPathMatch[1]);
  }

  try {
    const url = new URL(params.linkUrl, "https://browz.local");
    const fromQuery = url.searchParams.get("offer_group_id");
    return fromQuery?.trim() || null;
  } catch {
    return null;
  }
}

function getOfferAvailabilityState(params: {
  loading: boolean;
  notFound: boolean;
  groupStatus?: string;
  offerExpiresAt?: string | null;
  offeredSlotCount: number;
  nowMs: number;
}) {
  if (params.loading) {
    return "loading" as const;
  }

  if (params.notFound) {
    return "not_found" as const;
  }

  const expiresAtMs = parseExpiresAtMs(params.offerExpiresAt);
  if (expiresAtMs === null) {
    return "unverifiable" as const;
  }

  if (
    params.groupStatus === "expired" ||
    params.groupStatus === "cancelled" ||
    params.nowMs > expiresAtMs + EXPIRY_GRACE_MS
  ) {
    return "expired" as const;
  }

  if (params.groupStatus !== "offered" || params.offeredSlotCount === 0) {
    return "taken" as const;
  }

  return "active" as const;
}

function StatusBanner({
  state,
  expiresAt,
  nowMs,
}: {
  state: OfferAvailabilityState;
  expiresAt: string | null;
  nowMs: number;
}) {
  if (state === "loading") {
    return null;
  }

  if (state === "active") {
    const expiresAtMs = parseExpiresAtMs(expiresAt);
    const remaining =
      expiresAtMs === null ? 0 : Math.max(0, expiresAtMs - nowMs);
    const minutes = String(Math.floor(remaining / 60_000)).padStart(2, "0");
    const seconds = String(Math.floor((remaining % 60_000) / 1000)).padStart(
      2,
      "0",
    );

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-emerald-950">
            Choose a time
          </p>
          <p className="mt-1 text-xs text-emerald-900">
            Times can be claimed quickly — we'll confirm when you continue.
          </p>
        </div>
        <Badge className="rounded-full bg-white px-3 py-1 text-emerald-950 shadow-sm hover:bg-white">
          Expires in {minutes}:{seconds}
        </Badge>
      </div>
    );
  }

  const copy =
    state === "expired"
      ? "These times are no longer available."
      : state === "taken"
        ? "Those times were taken."
        : state === "not_found"
          ? "This notification is out of date."
          : "Unable to verify these times right now.";

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">{copy}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CheckNewTimesButton
// Used for expired/cancelled/taken offers. Calls /refresh and redirects to the
// new notification detail page.
// ─────────────────────────────────────────────────────────────────────────────

function CheckNewTimesButton({
  requestId,
  disabled,
}: {
  requestId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    if (!requestId) {
      toast.error("Unable to refresh — waitlist request info is missing.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/waitlist/requests/${encodeURIComponent(requestId)}/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancelled_reason: "rejoin" }),
        },
      );
      const result = (await response.json()) as RefreshResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to find new times.");
      }

      const { notification_id, offer_group_id, no_slots_reason } = result.data;

      if (!offer_group_id) {
        const msg =
          no_slots_reason === "no_specialists"
            ? "No specialists are available for this service right now."
            : no_slots_reason === "request_inactive"
              ? "Your waitlist request is no longer active."
              : "No new slots are available yet. We'll notify you when one opens.";
        toast.info(msg);
        return;
      }

      toast.success("Found new times — opening now…");

      if (notification_id) {
        router.push(`/notifications/${encodeURIComponent(notification_id)}`);
      } else {
        router.push(`/waitlist/offers/${encodeURIComponent(offer_group_id)}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to find new times.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="rounded-xl"
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Finding times…
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Check new times
        </>
      )}
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChangePreferencesDialog
// Calls /refresh with updated preferences, then redirects to the new
// notification detail page. Does NOT mutate the current notification in place.
// ─────────────────────────────────────────────────────────────────────────────

function ChangePreferencesDialog({
  requestId,
  serviceId,
  branchId,
  initialDateFrom,
  initialDateTo,
  initialTimeWindow,
  initialPreferredSpecialistId,
}: {
  requestId: string;
  serviceId: string;
  branchId: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialTimeWindow: "morning" | "afternoon" | "evening" | null;
  initialPreferredSpecialistId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rangeDays, setRangeDays] = React.useState(() => {
    const inclusive =
      differenceInCalendarDays(
        new Date(`${initialDateTo}T12:00:00Z`),
        new Date(`${initialDateFrom}T12:00:00Z`),
      ) + 1;
    return inclusive <= 7 ? "7" : inclusive <= 14 ? "14" : "30";
  });
  const [timeWindow, setTimeWindow] = React.useState<string>(
    initialTimeWindow ?? "any",
  );
  const [preferredSpecialist, setPreferredSpecialist] = React.useState<string>(
    initialPreferredSpecialistId ?? "any",
  );
  const [specialists, setSpecialists] = React.useState<SpecialistOption[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/specialists?service_id=${encodeURIComponent(serviceId)}&branch_id=${encodeURIComponent(branchId)}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load specialists.");
        }

        if (!cancelled) {
          setSpecialists(
            (result.data ?? []).map(
              (row: { id: string; name: string; title: string }) => ({
                id: row.id,
                name: row.name,
                title: row.title,
              }),
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed loading specialists for waitlist preferences:",
            error,
          );
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [branchId, open, serviceId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const start = new Date(`${initialDateFrom}T12:00:00Z`);
      const dateTo = format(
        addDays(start, Number(rangeDays) - 1),
        "yyyy-MM-dd",
      );

      toast.info("We're finding new times…");
      setOpen(false);

      const response = await fetch(
        `/api/waitlist/requests/${encodeURIComponent(requestId)}/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date_from: initialDateFrom,
            date_to: dateTo,
            time_window: timeWindow === "any" ? null : timeWindow,
            preferred_specialist_id:
              preferredSpecialist === "any" ? null : preferredSpecialist,
            cancelled_reason: "preferences_changed",
          }),
        },
      );
      const result = (await response.json()) as RefreshResponse;
      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to update waitlist preferences.",
        );
      }

      const { notification_id, offer_group_id, no_slots_reason } = result.data;

      if (!offer_group_id) {
        const msg =
          no_slots_reason === "no_specialists"
            ? "No specialists are available for this service right now."
            : no_slots_reason === "request_inactive"
              ? "Your waitlist request is no longer active."
              : "No new slots match your preferences yet. We'll notify you when one opens.";
        toast.info(msg);
        return;
      }

      toast.success("Preferences updated — opening new times…");

      if (notification_id) {
        router.push(`/notifications/${encodeURIComponent(notification_id)}`);
      } else {
        router.push(`/waitlist/offers/${encodeURIComponent(offer_group_id)}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update waitlist preferences.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          Change preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change waitlist preferences</DialogTitle>
          <DialogDescription>
            Adjust the range, time window, or specialist preference. We'll find
            new slots immediately and open them in a fresh notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date range</Label>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time of day</Label>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger>
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Specialist preference</Label>
            <Select
              value={preferredSpecialist}
              onValueChange={setPreferredSpecialist}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any specialist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any specialist</SelectItem>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    {specialist.name}
                    {specialist.title ? ` - ${specialist.title}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Finding times…" : "Save & find new times"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaitlistOfferSelector (main export)
// ─────────────────────────────────────────────────────────────────────────────

export function WaitlistOfferSelector({
  offerGroupId,
  linkUrl,
  notificationId,
  fallbackServiceName,
  fallbackBranchName,
  fallbackExpiresAt,
  failedSlotId,
  initialData,
}: {
  offerGroupId: string | null;
  linkUrl?: string | null;
  notificationId?: string | null;
  fallbackServiceName?: string | null;
  fallbackBranchName?: string | null;
  fallbackExpiresAt?: string | null;
  failedSlotId?: string | null;
  initialData?: WaitlistOfferGroupResponse["data"] | null;
}) {
  const stableOfferGroupId = React.useMemo(
    () => extractOfferGroupId({ offerGroupId, linkUrl }),
    [linkUrl, offerGroupId],
  );
  const [details, setDetails] = React.useState<
    WaitlistOfferGroupResponse["data"] | null
  >(initialData ?? null);
  const [loading, setLoading] = React.useState(
    !initialData && Boolean(stableOfferGroupId),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(
    !initialData && !stableOfferGroupId,
  );
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [showDebug, setShowDebug] = React.useState(false);

  const fetchOfferDetails = React.useCallback(
    async (silent = false) => {
      if (!stableOfferGroupId) {
        if (!silent) {
          setLoading(false);
          setNotFound(true);
          setError(null);
        }
        return;
      }

      if (!silent) {
        setLoading(true);
        setError(null);
        setNotFound(false);
      }

      try {
        const response = await fetch(
          `/api/waitlist/offer-groups/${encodeURIComponent(stableOfferGroupId)}`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as WaitlistOfferGroupResponse & {
          error?: string;
        };

        if (!response.ok) {
          if (response.status === 404) {
            setNotFound(true);
            setDetails(null);
            return;
          }
          throw new Error(result.error ?? "Unable to load waitlist offer.");
        }

        setDetails(result.data);
      } catch (fetchError) {
        if (!silent) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load waitlist offer.",
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [stableOfferGroupId],
  );

  React.useEffect(() => {
    if (!initialData) {
      // No cached data — fetch immediately and show loading state
      void fetchOfferDetails(false);
      return;
    }
    // Cached data available — render immediately, then revalidate silently
    // in the background to get live status, full request details, and all slots.
    const timer = window.setTimeout(() => {
      void fetchOfferDetails(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOfferDetails, initialData]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresAt =
    details?.group.offer_expires_at ?? fallbackExpiresAt ?? null;
  const slots = details?.slots ?? [];
  const offeredSlots = slots.filter((slot) => slot.status === "offered");
  const state = getOfferAvailabilityState({
    loading,
    notFound,
    groupStatus: details?.group.status,
    offerExpiresAt: expiresAt,
    offeredSlotCount: offeredSlots.length,
    nowMs,
  });

  const serviceName = details?.service.name ?? fallbackServiceName ?? "Service";
  const branchName = details?.branch.name ?? fallbackBranchName ?? "Branch";

  // The request id is needed for the refresh actions
  const requestId = details?.request.id ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {state === "active" ? "Choose a time" : "Appointment times"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {serviceName} · {branchName}
          </p>
        </div>
      </div>

      {/* Status banner — shows countdown when active, "no longer available" when not */}
      <StatusBanner state={state} expiresAt={expiresAt} nowMs={nowMs} />

      {/* Supporting copy for inactive states */}
      {!loading && state === "expired" ? (
        <p className="text-sm text-muted-foreground">
          No worries — we'll notify you when new times open.
        </p>
      ) : !loading && state === "taken" ? (
        <p className="text-sm text-muted-foreground">
          You're still on the waitlist — we'll alert you when more times open.
        </p>
      ) : !loading && state === "not_found" ? (
        <p className="text-sm text-muted-foreground">
          New times may already be available — check again.
        </p>
      ) : null}

      {failedSlotId ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">That slot was just taken.</p>
            <p className="mt-1 text-amber-900">
              The remaining options below are still available to try.
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the latest slots…
        </div>
      ) : state === "active" && slots.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pick the time that suits you best:
          </p>
          {slots.map((slot) => {
            const disabled =
              slot.status !== "offered" ||
              (failedSlotId ? slot.id === failedSlotId : false);
            const bookParams = new URLSearchParams({
              waitlist_offer_group: stableOfferGroupId ?? "",
              waitlist_slot: slot.id,
            });
            if (notificationId) {
              bookParams.set("waitlist_notification", notificationId);
            }

            return (
              <div
                key={slot.id}
                className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-4 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    {format(new Date(slot.starts_at), "EEE, MMM d")} —{" "}
                    {format(new Date(slot.starts_at), "h:mm a")}–
                    {format(new Date(slot.ends_at), "h:mm a")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {slot.specialist.name}
                    {slot.specialist.title ? ` · ${slot.specialist.title}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {disabled ? <Badge variant="secondary">Taken</Badge> : null}
                  {disabled ? (
                    <Button disabled className="rounded-xl">
                      Choose
                    </Button>
                  ) : (
                    <Button asChild className="rounded-xl">
                      <Link href={`/book?${bookParams.toString()}`}>
                        Choose
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Change preferences (active) / Check new times (inactive) — same position */}
      {state === "active" && details?.request ? (
        <div className="flex flex-wrap items-center gap-3">
          <ChangePreferencesDialog
            requestId={details.request.id}
            serviceId={details.request.service_id}
            branchId={details.request.branch_id}
            initialDateFrom={details.request.date_from}
            initialDateTo={details.request.date_to}
            initialTimeWindow={details.request.time_window}
            initialPreferredSpecialistId={
              details.request.preferred_specialist_id
            }
          />
        </div>
      ) : !loading && state !== "loading" && requestId ? (
        <div className="flex flex-wrap items-center gap-3">
          <CheckNewTimesButton requestId={requestId} />
        </div>
      ) : null}

      {process.env.NODE_ENV !== "production" ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          <button
            type="button"
            className="inline-flex items-center gap-2 font-medium text-foreground"
            onClick={() => setShowDebug((current) => !current)}
          >
            Debug details
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                showDebug ? "rotate-180" : ""
              }`}
            />
          </button>
          {showDebug ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(
                {
                  notification_id: notificationId,
                  extracted_offer_group_id: stableOfferGroupId,
                  fetch_status: state,
                  error,
                },
                null,
                2,
              )}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
