import type { BookingStatus } from "@/lib/constants/booking-status";

export type BookingChannel =
  | "web"
  | "admin"
  | "phone"
  | "whatsapp"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "partner"
  | "api"
  | "other";

export type BookingKind = "service" | "package";

export type RelatedEntity = {
  id: string;
  name: string;
};

export type PaymentStatus = "pending" | "succeeded" | "failed" | "canceled";

export type AdminBookingRow = {
  id: string;
  booking_kind: BookingKind;
  package_id: string | null;
  package: RelatedEntity & {
    slug: string | null;
  } | null;
  status: BookingStatus;
  booking_channel: BookingChannel;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  created_at: string;
  duration_minutes: number;
  starts_in_seconds: number;
  pending_age_seconds: number;
  requires_attention: boolean;
  attention_reasons: string[];
  attention_priority: number;
  payment_status: PaymentStatus | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
  customer: {
    id: string | null;
    name: string;
    email: string | null;
    phone: string | null;
  };
  service: RelatedEntity & {
    slug: string;
    min_price_cents: number;
    max_price_cents: number;
    currency: string;
    duration_minutes: number;
  };
  branch: RelatedEntity & {
    city: string | null;
    country: string | null;
    address: string | null;
  };
  specialist: RelatedEntity & {
    title: string | null;
  };
};

export type AdminBookingsListResponse = {
  data: AdminBookingRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminBookingsSort =
  | "attention"
  | "starts_at_asc"
  | "starts_at_desc"
  | "created_at_desc"
  | "created_at_asc"
  | "age_desc";

export type LookupOption = {
  id: string;
  name: string;
};

export type AdminBookingFiltersResponse = {
  data: {
    branches: LookupOption[];
    specialists: LookupOption[];
    services: LookupOption[];
  };
};

export type EntityOrArray<T> = T | T[] | null;

export type AdminBookingDetail = {
  id: string;
  user_id: string;
  booking_kind: BookingKind;
  package_id: string | null;
  booking_channel: BookingChannel;
  booking_channel_meta: Record<string, unknown> | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  payment_status: PaymentStatus | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
  package: EntityOrArray<RelatedEntity & { slug?: string | null }>;
  service: EntityOrArray<RelatedEntity & { slug?: string | null }>;
  branch: EntityOrArray<
    RelatedEntity & { city?: string | null; country?: string | null; address?: string | null }
  >;
  specialist: EntityOrArray<RelatedEntity & { title?: string | null }>;
};

export type AdminBookingDetailsResponse = {
  data: {
    booking: AdminBookingDetail;
    customer: {
      id: string | null;
      name: string;
      email: string | null;
      phone: string | null;
    };
    audit_trail: Array<{
      id: string;
      action_type: string;
      actor_role: string;
      decision: string;
      decision_reason: string | null;
      created_at: string;
      metadata: Record<string, unknown> | null;
    }>;
    reschedule_history: Array<{
      id: string;
      old_starts_at: string;
      old_ends_at: string;
      new_starts_at: string;
      new_ends_at: string;
      changed_at: string;
      reason: string | null;
      is_admin_override: boolean | null;
    }>;
    change_requests: Array<{
      id: string;
      type: "reschedule";
      status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
      proposed_starts_at: string;
      proposed_ends_at: string;
      reason: string;
      requested_at: string;
      customer_response: "accepted" | "declined" | "proposed_new_time" | null;
      customer_message: string | null;
      customer_proposed_starts_at: string | null;
      customer_proposed_ends_at: string | null;
      responded_at: string | null;
    }>;
  };
};

export type StatsState = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
};

export type StatusTab = "all" | "pending" | "confirmed" | "rescheduled" | "completed" | "cancelled";

export type RejectTarget =
  | {
      mode: "single";
      booking: AdminBookingRow;
    }
  | {
      mode: "bulk";
      ids: string[];
    }
  | null;

export type RescheduleTarget = AdminBookingRow | null;

export type CompleteTarget = AdminBookingRow | null;

export type CompletionAftercareDraft = {
  instructions: string;
  what_to_do: string;
  what_to_avoid: string;
  important_notes: string;
};
