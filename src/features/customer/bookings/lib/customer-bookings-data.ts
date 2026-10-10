import "server-only";

import { type BookingStatus } from "@/lib/constants/booking-status";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export interface CustomerBookingItem {
  id: string;
  bookingKind: "service" | "package";
  bookingTitle: string;
  packageId: string | null;
  packageName: string | null;
  packageSlug: string | null;
  serviceId: string;
  branchId: string;
  specialistId: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  serviceName: string;
  serviceSlug: string | null;
  venueName: string;
  venueAddress: string | null;
  specialistName: string;
  specialistTitle: string | null;
  paymentStatus: "pending" | "succeeded" | "failed" | "canceled" | null;
  paymentAmountCents: number | null;
  paymentCurrency: string | null;
  hasPendingChangeRequest: boolean;
}

type BookingRow = {
  id: string;
  booking_kind: "service" | "package";
  package_id: string | null;
  service_id: string;
  branch_id: string;
  specialist_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  payment_status: "pending" | "succeeded" | "failed" | "canceled" | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
  package:
    | {
        name: string;
        slug: string;
      }
    | Array<{
        name: string;
        slug: string;
      }>
    | null;
  service:
    | {
        name: string;
        slug: string;
      }
    | Array<{
        name: string;
        slug: string;
      }>
    | null;
  branch:
    | {
        name: string;
        address: string;
        city: string;
        country: string;
      }
    | Array<{
        name: string;
        address: string;
        city: string;
        country: string;
      }>
    | null;
  specialist:
    | {
        name: string;
        title: string;
      }
    | Array<{
        name: string;
        title: string;
      }>
    | null;
};

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeRow(row: BookingRow): CustomerBookingItem {
  const service = toSingle(row.service);
  const pkg = toSingle(row.package);
  const branch = toSingle(row.branch);
  const specialist = toSingle(row.specialist);

  return {
    id: row.id,
    bookingKind: row.booking_kind,
    bookingTitle: pkg?.name ?? service?.name ?? "Booking",
    packageId: row.package_id,
    packageName: pkg?.name ?? null,
    packageSlug: pkg?.slug ?? null,
    serviceId: row.service_id,
    branchId: row.branch_id,
    specialistId: row.specialist_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    notes: row.notes,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    serviceName: service?.name ?? "Service",
    serviceSlug: service?.slug ?? null,
    venueName: branch?.name ?? "Branch",
    venueAddress: branch
      ? `${branch.address}, ${branch.city}, ${branch.country}`
      : null,
    specialistName: specialist?.name ?? "Specialist",
    specialistTitle: specialist?.title ?? null,
    paymentStatus: row.payment_status,
    paymentAmountCents: row.payment_amount_cents,
    paymentCurrency: row.payment_currency,
    hasPendingChangeRequest: false,
  };
}

export async function getCustomerBookings(userId: string): Promise<CustomerBookingItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,booking_kind,package_id,service_id,branch_id,specialist_id,starts_at,ends_at,status,notes,rejection_reason,created_at,payment_status,payment_amount_cents,payment_currency,package:packages(name,slug),service:services(name,slug),branch:branches(name,address,city,country),specialist:specialists(name,title)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch customer bookings:", error.message);
    return [];
  }

  const bookings = ((data ?? []) as BookingRow[]).map(normalizeRow);
  if (bookings.length === 0) {
    return bookings;
  }

  const serviceSupabase = await createServiceRoleClient("customer_bookings_read");
  const { data: changeRequests, error: changeRequestError } = await serviceSupabase
    .from("booking_change_requests")
    .select("booking_id,status")
    .in("booking_id", bookings.map((booking) => booking.id))
    .eq("status", "pending");

  if (changeRequestError) {
    console.error("Failed to fetch pending booking change requests:", changeRequestError.message);
    return bookings;
  }

  const pendingBookingIds = new Set(
    (changeRequests ?? [])
      .map((row) => row.booking_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );

  return bookings.map((booking) => ({
    ...booking,
    hasPendingChangeRequest: pendingBookingIds.has(booking.id),
  }));
}

export async function getCustomerBookingById(
  userId: string,
  bookingId: string,
): Promise<CustomerBookingItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,booking_kind,package_id,service_id,branch_id,specialist_id,starts_at,ends_at,status,notes,rejection_reason,created_at,payment_status,payment_amount_cents,payment_currency,package:packages(name,slug),service:services(name,slug),branch:branches(name,address,city,country),specialist:specialists(name,title)",
    )
    .eq("user_id", userId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to fetch booking by id:", error.message);
    }
    return null;
  }

  const booking = normalizeRow(data as BookingRow);
  const serviceSupabase = await createServiceRoleClient("customer_bookings_read");
  const { data: changeRequest, error: changeRequestError } = await serviceSupabase
    .from("booking_change_requests")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (changeRequestError) {
    console.error("Failed to fetch pending booking change request by id:", changeRequestError.message);
    return booking;
  }

  return {
    ...booking,
    hasPendingChangeRequest: Boolean(changeRequest),
  };
}
