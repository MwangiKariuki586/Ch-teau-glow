export const POLICY_PACK_VERSION = "v1";

export const FREE_CANCEL_HOURS = 24;
export const CANCEL_CUTOFF_HOURS = 12;
export const RESCHEDULE_CUTOFF_HOURS = 12;
export const MAX_RESCHEDULES = 2;

export type BookingPolicyAction =
  | "cancel"
  | "reschedule"
  | "preview_cancel"
  | "preview_reschedule";

export type BookingActorRole = "customer" | "admin";

export type BookingPolicyBooking = {
  id?: string;
  user_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  reschedule_count?: number;
};

export type BookingRequestedChange = {
  new_starts_at: string;
  new_ends_at: string;
};

export type BookingPolicyFlags = {
  late_cancel?: boolean;
  requires_override_reason?: boolean;
  max_reschedules_reached?: boolean;
};

export type BookingPolicyEffects = {
  next_status?: "cancelled";
  next_starts_at?: string;
  next_ends_at?: string;
  keep_status?: boolean;
};

export type BookingPolicyWindow = {
  booking_starts_at: string;
  booking_ends_at: string;
  free_cancel_until: string;
  cancel_cutoff_at: string;
  reschedule_cutoff_at: string;
};

export type BookingPolicyEvaluation = {
  allowed: boolean;
  reason: string;
  effects: BookingPolicyEffects;
  flags: BookingPolicyFlags;
  window: BookingPolicyWindow;
  policySnapshot: Record<string, unknown>;
};

type EvaluateBookingPolicyInput = {
  action: BookingPolicyAction;
  actorRole: BookingActorRole;
  actorUserId: string;
  booking: BookingPolicyBooking;
  now?: Date;
  requestedChange?: BookingRequestedChange;
};

const HOUR_MS = 60 * 60 * 1000;

const CUSTOMER_CANCELLABLE_STATUSES = new Set(["pending", "confirmed"]);
const CUSTOMER_RESCHEDULABLE_STATUSES = new Set(["pending"]);

function isCancelAction(action: BookingPolicyAction) {
  return action === "cancel" || action === "preview_cancel";
}

function isPreviewAction(action: BookingPolicyAction) {
  return action === "preview_cancel" || action === "preview_reschedule";
}

function denied(
  reason: string,
  flags: BookingPolicyFlags,
  window: BookingPolicyWindow,
  policySnapshot: Record<string, unknown>,
): BookingPolicyEvaluation {
  return {
    allowed: false,
    reason,
    effects: {},
    flags,
    window,
    policySnapshot,
  };
}

export function evaluateBookingPolicy({
  action,
  actorRole,
  actorUserId,
  booking,
  now = new Date(),
  requestedChange,
}: EvaluateBookingPolicyInput): BookingPolicyEvaluation {
  const startsAt = new Date(booking.starts_at);
  const endsAt = new Date(booking.ends_at);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    const fallbackWindow: BookingPolicyWindow = {
      booking_starts_at: booking.starts_at,
      booking_ends_at: booking.ends_at,
      free_cancel_until: booking.starts_at,
      cancel_cutoff_at: booking.starts_at,
      reschedule_cutoff_at: booking.starts_at,
    };

    return denied(
      "Booking times are invalid.",
      {},
      fallbackWindow,
      {
        policy_pack: POLICY_PACK_VERSION,
        action,
        now: now.toISOString(),
        invalid_booking_time: true,
      },
    );
  }

  const startsAtMs = startsAt.getTime();
  const nowMs = now.getTime();

  const freeCancelCutoffAt = new Date(startsAtMs - FREE_CANCEL_HOURS * HOUR_MS);
  const cancelCutoffAt = new Date(startsAtMs - CANCEL_CUTOFF_HOURS * HOUR_MS);
  const rescheduleCutoffAt = new Date(startsAtMs - RESCHEDULE_CUTOFF_HOURS * HOUR_MS);

  const window: BookingPolicyWindow = {
    booking_starts_at: startsAt.toISOString(),
    booking_ends_at: endsAt.toISOString(),
    free_cancel_until: freeCancelCutoffAt.toISOString(),
    cancel_cutoff_at: cancelCutoffAt.toISOString(),
    reschedule_cutoff_at: rescheduleCutoffAt.toISOString(),
  };

  const flags: BookingPolicyFlags = {};

  const policySnapshot: Record<string, unknown> = {
    policy_pack: POLICY_PACK_VERSION,
    action,
    actor_role: actorRole,
    actor_user_id: actorUserId,
    evaluated_at: now.toISOString(),
    thresholds: {
      FREE_CANCEL_HOURS,
      CANCEL_CUTOFF_HOURS,
      RESCHEDULE_CUTOFF_HOURS,
      MAX_RESCHEDULES,
    },
    booking: {
      id: booking.id ?? null,
      user_id: booking.user_id,
      status: booking.status,
      starts_at: booking.starts_at,
      ends_at: booking.ends_at,
      reschedule_count: booking.reschedule_count ?? 0,
    },
    window,
  };

  if (isCancelAction(action)) {
    if (actorRole === "customer") {
      if (actorUserId !== booking.user_id) {
        return denied("You can only cancel your own booking.", flags, window, policySnapshot);
      }

      if (!CUSTOMER_CANCELLABLE_STATUSES.has(booking.status)) {
        return denied(
          "Only pending or confirmed bookings can be cancelled.",
          flags,
          window,
          policySnapshot,
        );
      }

      if (nowMs >= startsAtMs) {
        return denied(
          "This booking has already started and cannot be cancelled.",
          flags,
          window,
          policySnapshot,
        );
      }

      if (nowMs > cancelCutoffAt.getTime()) {
        return denied(
          `Cancellation window has closed (less than ${CANCEL_CUTOFF_HOURS} hours before start).`,
          flags,
          window,
          policySnapshot,
        );
      }

      if (
        nowMs > freeCancelCutoffAt.getTime() &&
        nowMs <= cancelCutoffAt.getTime()
      ) {
        flags.late_cancel = true;
      }
    }

    if (actorRole === "admin") {
      flags.requires_override_reason = true;
    }

    return {
      allowed: true,
      reason: "Cancellation is allowed.",
      effects: {
        next_status: "cancelled",
      },
      flags,
      window,
      policySnapshot,
    };
  }

  if (actorRole === "customer") {
    if (actorUserId !== booking.user_id) {
      return denied("You can only reschedule your own booking.", flags, window, policySnapshot);
    }

    if (!CUSTOMER_RESCHEDULABLE_STATUSES.has(booking.status)) {
      return denied(
        "Only pending bookings can be rescheduled.",
        flags,
        window,
        policySnapshot,
      );
    }

    if (nowMs >= startsAtMs) {
      return denied(
        "This booking has already started and cannot be rescheduled.",
        flags,
        window,
        policySnapshot,
      );
    }

    if (nowMs > rescheduleCutoffAt.getTime()) {
      return denied(
        `Reschedule window has closed (less than ${RESCHEDULE_CUTOFF_HOURS} hours before start).`,
        flags,
        window,
        policySnapshot,
      );
    }

    if ((booking.reschedule_count ?? 0) >= MAX_RESCHEDULES) {
      flags.max_reschedules_reached = true;
      return denied(
        `Reschedule limit reached (${MAX_RESCHEDULES} changes).`,
        flags,
        window,
        policySnapshot,
      );
    }
  }

  if (actorRole === "admin" && nowMs > rescheduleCutoffAt.getTime()) {
    flags.requires_override_reason = true;
  }

  const shouldValidateRequestedChange = !isPreviewAction(action) || Boolean(requestedChange);

  if (shouldValidateRequestedChange) {
    if (!requestedChange) {
      return denied("New start and end time are required.", flags, window, policySnapshot);
    }

    const nextStartsAt = new Date(requestedChange.new_starts_at);
    const nextEndsAt = new Date(requestedChange.new_ends_at);

    if (
      Number.isNaN(nextStartsAt.getTime()) ||
      Number.isNaN(nextEndsAt.getTime())
    ) {
      return denied("Invalid reschedule datetime values.", flags, window, policySnapshot);
    }

    if (nextEndsAt.getTime() <= nextStartsAt.getTime()) {
      return denied(
        "Reschedule end time must be after the start time.",
        flags,
        window,
        policySnapshot,
      );
    }

    if (nextStartsAt.getTime() <= nowMs) {
      return denied(
        "Reschedule time must be in the future.",
        flags,
        window,
        policySnapshot,
      );
    }

    policySnapshot.requested_change = {
      new_starts_at: requestedChange.new_starts_at,
      new_ends_at: requestedChange.new_ends_at,
    };

    return {
      allowed: true,
      reason: "Reschedule is allowed.",
      effects: {
        next_starts_at: nextStartsAt.toISOString(),
        next_ends_at: nextEndsAt.toISOString(),
        keep_status: true,
      },
      flags,
      window,
      policySnapshot,
    };
  }

  return {
    allowed: true,
    reason: "Reschedule is allowed.",
    effects: {
      keep_status: true,
    },
    flags,
    window,
    policySnapshot,
  };
}
