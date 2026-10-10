import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon, Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type BookingStatus } from "@/lib/constants/booking-status";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import {
  PaymentStatusBadge,
  formatPaymentAmount,
} from "@/features/shared/payment";
import { getCustomerBookingById } from "@/features/customer/bookings/lib/customer-bookings-data";
import { BookingDetailInteractionPanel } from "@/features/customer/bookings/components/booking-detail-interaction-panel";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const statusClassMap: Record<BookingStatus, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  confirmed:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  rescheduled:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
  no_show: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
};

const actionRequiredBadgeClassName =
  "bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300";

function formatStatusLabel(status: BookingStatus) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

type BookingReviewRow = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

export default async function CustomerBookingDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const booking = await getCustomerBookingById(user.id, id);
  if (!booking) {
    notFound();
  }

  const { data: review } = await supabase
    .from("booking_reviews")
    .select("id,rating,review_text,created_at")
    .eq("booking_id", booking.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const serviceSupabase = await createServiceRoleClient("customer_bookings_read");
  const { data: changeRequest, error: changeRequestError } = await serviceSupabase
    .from("booking_change_requests")
    .select(
      "id,type,status,proposed_starts_at,proposed_ends_at,reason,requested_at,customer_response,customer_message,customer_proposed_starts_at,customer_proposed_ends_at,responded_at",
    )
    .eq("booking_id", booking.id)
    .in("status", ["pending", "countered"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (changeRequestError) {
    console.error("Failed to load pending booking change request:", changeRequestError);
  }

  const rawAction = Array.isArray(resolvedSearchParams.action)
    ? resolvedSearchParams.action[0]
    : resolvedSearchParams.action;
  const initialAction =
    rawAction === "cancel" || rawAction === "reschedule" ? rawAction : null;
  const isPackageBooking = booking.bookingKind === "package";

  return (
    <div className="flex flex-col gap-6 pb-8">
      <Link
        href="/customer/bookings"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to My Bookings
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isPackageBooking ? "Package Booking Details" : "Booking Details"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isPackageBooking
            ? "View your package intake summary and next actions."
            : "View your appointment summary and next actions."}
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{booking.bookingTitle}</CardTitle>
          <Badge
            className={
              booking.hasPendingChangeRequest
                ? actionRequiredBadgeClassName
                : (statusClassMap[booking.status] ?? "")
            }
          >
            {booking.hasPendingChangeRequest
              ? "Action required"
              : formatStatusLabel(booking.status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Booking ID: {booking.id}
          </p>
          {isPackageBooking ? (
            <p className="text-sm text-muted-foreground">
              Intake service: {booking.serviceName}
            </p>
          ) : null}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(new Date(booking.startsAt), "EEEE, MMM dd, yyyy")}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {format(new Date(booking.startsAt), "hh:mm a")} -{" "}
            {format(new Date(booking.endsAt), "hh:mm a")}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {booking.venueAddress ?? booking.venueName}
          </div>
          <p className="text-sm text-muted-foreground">
            Specialist: {booking.specialistName}
            {booking.specialistTitle ? ` (${booking.specialistTitle})` : ""}
          </p>
        </CardContent>
      </Card>

      <BookingDetailInteractionPanel
        booking={{
          id: booking.id,
          status: booking.status,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          serviceId: booking.serviceId,
              serviceSlug: booking.serviceSlug,
              branchId: booking.branchId,
              specialistId: booking.specialistId,
              serviceName: isPackageBooking
                ? `${booking.bookingTitle} · Intake service: ${booking.serviceName}`
                : booking.serviceName,
              venueName: booking.venueName,
              specialistName: booking.specialistName,
            }}
        bookingStatus={booking.status}
        initialReview={(review as BookingReviewRow | null) ?? null}
        pendingChangeRequest={changeRequest ?? null}
        initialAction={initialAction}
      />

      {booking.paymentStatus ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#6B4423]/70">
                Payment
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Payment status for this booking.</p>
            </div>
            <div className="flex items-center gap-3">
              <PaymentStatusBadge status={booking.paymentStatus} />
              <p className="font-medium text-foreground">
                {formatPaymentAmount(
                  booking.paymentAmountCents,
                  booking.paymentCurrency,
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {booking.rejectionReason?.trim() ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <p className="font-medium text-rose-900">Reason</p>
          <p className="mt-1">{booking.rejectionReason.trim()}</p>
        </div>
      ) : null}

      {booking.notes ? (
        <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Notes</p>
          <p className="mt-1">{booking.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        {booking.serviceSlug ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/services/${booking.serviceSlug}`}>
              {isPackageBooking ? "View Intake Service" : "View Service"}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
