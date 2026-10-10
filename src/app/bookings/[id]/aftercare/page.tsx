import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

type BookingRow = {
  id: string;
  user_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
};

type ServiceDetailItemRow = {
  id: string;
  detail_key: string;
  display_label: string | null;
  detail_value: string | null;
  display_order: number;
};

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const SECTION_LABELS: Record<string, string> = {
  aftercare_do: "What to do",
  aftercare_avoid: "What to avoid",
  aftercare_notes: "Important notes",
};

export default async function BookingAftercarePage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id,user_id,service_id,starts_at,ends_at,status,service:services(name)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (bookingError || !booking) {
    notFound();
  }

  const bookingRow = booking as BookingRow;
  const service = toSingle(bookingRow.service);
  const serviceName = service?.name ?? "Service";
  const { data: bookingAftercare } = await supabase
    .from("booking_aftercare_instructions")
    .select("instructions,what_to_do,what_to_avoid,important_notes")
    .eq("booking_id", bookingRow.id)
    .maybeSingle();

  const { data: detailItems } = await supabase
    .from("service_detail_items")
    .select("id,detail_key,display_label,detail_value,display_order")
    .eq("service_id", bookingRow.service_id)
    .in("detail_key", ["aftercare_do", "aftercare_avoid", "aftercare_notes"])
    .order("display_order", { ascending: true });

  const { data: serviceDetails } = await supabase
    .from("service_details")
    .select("meta")
    .eq("service_id", bookingRow.service_id)
    .maybeSingle();

  const grouped = (detailItems ?? []).reduce<
    Record<string, ServiceDetailItemRow[]>
  >((acc, item) => {
    if (!acc[item.detail_key]) acc[item.detail_key] = [];
    acc[item.detail_key].push(item as ServiceDetailItemRow);
    return acc;
  }, {});

  const sectionOrder = ["aftercare_do", "aftercare_avoid", "aftercare_notes"];
  const hasAftercareContent = sectionOrder.some(
    (key) => (grouped[key]?.length ?? 0) > 0,
  );
  const bookingAftercareSections = [
    {
      key: "instructions",
      title: "Guidance",
      value: bookingAftercare?.instructions?.trim() || null,
    },
    {
      key: "what_to_do",
      title: "What to do",
      value: bookingAftercare?.what_to_do?.trim() || null,
    },
    {
      key: "what_to_avoid",
      title: "What to avoid",
      value: bookingAftercare?.what_to_avoid?.trim() || null,
    },
    {
      key: "important_notes",
      title: "Important notes",
      value: bookingAftercare?.important_notes?.trim() || null,
    },
  ].filter((section) => Boolean(section.value));
  const hasBookingSpecificAftercare = bookingAftercareSections.length > 0;

  return (
    <div className="mx-auto w-full md:px-6">
      <Link
        href={`/customer/bookings/${bookingRow.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to booking details
      </Link>

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">After-care</h1>
          <p className="mt-1 text-muted-foreground">
            Follow these recommendations for your best recovery outcome.
          </p>
        </div>
        <Badge variant="outline">{bookingRow.status}</Badge>
      </div>

      <Card className="mb-6 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{serviceName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Booking ID: {bookingRow.id}</p>
          <p>
            Schedule: {format(new Date(bookingRow.starts_at), "PPP p")} -{" "}
            {format(new Date(bookingRow.ends_at), "PPP p")}
          </p>
        </CardContent>
      </Card>

      {hasBookingSpecificAftercare ? (
        <div className="space-y-4">
          {bookingAftercareSections.map((section) => (
            <Card key={section.key} className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {section.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hasAftercareContent ? (
        <div className="space-y-4">
          {sectionOrder.map((key) => {
            const rows = grouped[key] ?? [];
            if (rows.length === 0) return null;
            return (
              <Card key={key} className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {SECTION_LABELS[key] ?? key.replace(/_/g, " ")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {rows.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-md border bg-muted/20 p-3"
                      >
                        <p className="font-medium text-foreground">
                          {item.display_label?.trim() || "Guidance"}
                        </p>
                        <p className="mt-1">
                          {item.detail_value?.trim() || "-"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>No custom after-care notes yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Keep the treated area clean, avoid irritants, and contact our care
              team if you notice unusual swelling, pain, or discomfort.
            </p>
            {serviceDetails?.meta &&
              typeof serviceDetails.meta === "object" &&
              !Array.isArray(serviceDetails.meta) &&
              typeof (serviceDetails.meta as Record<string, unknown>)
                .aftercare_contact === "string" && (
                <p>
                  Care contact:{" "}
                  {
                    (serviceDetails.meta as Record<string, unknown>)
                      .aftercare_contact as string
                  }
                </p>
              )}
            <p>
              Need help now? Reach us via{" "}
              <Link
                href="/contact"
                className="font-medium text-primary underline"
              >
                Contact Support
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
