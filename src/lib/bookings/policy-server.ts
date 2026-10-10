import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { BookingActorRole, BookingPolicyAction } from "@/lib/bookings/policy-engine";

export type BookingRow = {
  id: string;
  user_id: string;
  service_id: string;
  branch_id: string;
  specialist_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
};

export type BookingSummaryRow = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
};

type ServiceSupabaseClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

export async function getBookingActorContext() {
  const sessionSupabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await sessionSupabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "Authentication required.",
    };
  }

  let serviceSupabase: ServiceSupabaseClient;
  try {
    serviceSupabase = await createServiceRoleClient("booking_policy");
  } catch (error) {
    return {
      ok: false as const,
      status: 500,
      error: error instanceof Error ? error.message : "Failed to initialize service role client.",
    };
  }
  // Use app_metadata.role for consistency with other auth checks
  const actorRole: BookingActorRole = user.app_metadata?.role === "admin" ? "admin" : "customer";

  return {
    ok: true as const,
    data: {
      userId: user.id,
      actorRole,
      serviceSupabase,
    },
  };
}

export async function getBookingById(
  serviceSupabase: ServiceSupabaseClient,
  bookingId: string,
): Promise<{ booking: BookingRow | null; error: string | null }> {
  const { data, error } = await serviceSupabase
    .from("bookings")
    .select("id,user_id,service_id,branch_id,specialist_id,starts_at,ends_at,status,notes")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    return { booking: null, error: error.message };
  }

  return { booking: (data as BookingRow | null) ?? null, error: null };
}

export async function getBookingRescheduleCount(
  serviceSupabase: ServiceSupabaseClient,
  bookingId: string,
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await serviceSupabase
    .from("booking_reschedules")
    .select("id", { head: true, count: "exact" })
    .eq("booking_id", bookingId);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export async function getAnyBookingChangeRequest(
  serviceSupabase: ServiceSupabaseClient,
  bookingId: string,
): Promise<{ request: { id: string; status: string } | null; error: string | null }> {
  const { data, error } = await serviceSupabase
    .from("booking_change_requests")
    .select("id,status")
    .eq("booking_id", bookingId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { request: null, error: error.message };
  }

  return {
    request: (data as { id: string; status: string } | null) ?? null,
    error: null,
  };
}

export async function logBookingAction(params: {
  serviceSupabase: ServiceSupabaseClient;
  bookingId: string;
  actionType: BookingPolicyAction;
  actorUserId: string;
  actorRole: BookingActorRole;
  decision: "approved" | "denied";
  decisionReason: string;
  policySnapshot: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await params.serviceSupabase.from("booking_actions").insert({
    booking_id: params.bookingId,
    action_type: params.actionType,
    actor_user_id: params.actorUserId,
    actor_role: params.actorRole,
    decision: params.decision,
    decision_reason: params.decisionReason,
    policy_snapshot: params.policySnapshot,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function appendReasonToNotes(params: {
  existingNotes: string | null;
  label: string;
  reason?: string;
}) {
  const normalizedReason = params.reason?.trim();
  if (!normalizedReason) return params.existingNotes;

  const nextLine = `${params.label}: ${normalizedReason}`;
  return params.existingNotes ? `${params.existingNotes}\n\n${nextLine}` : nextLine;
}

export async function getBookingSummaryById(
  serviceSupabase: ServiceSupabaseClient,
  bookingId: string,
): Promise<{ booking: BookingSummaryRow | null; error: string | null }> {
  const { data, error } = await serviceSupabase
    .from("bookings")
    .select("id,status,starts_at,ends_at,notes")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    return { booking: null, error: error.message };
  }

  return { booking: (data as BookingSummaryRow | null) ?? null, error: null };
}
