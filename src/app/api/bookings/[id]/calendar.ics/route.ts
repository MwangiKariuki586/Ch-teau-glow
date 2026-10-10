import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type BookingCalendarRow = {
  id: string;
  user_id: string;
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
  branch:
    | {
        name: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
      }
    | Array<{
        name: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
      }>
    | null;
};

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id,user_id,starts_at,ends_at,status,service:services(name),branch:branches(name,address,city,country)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const row = booking as BookingCalendarRow;

  if (!["confirmed", "rescheduled"].includes(row.status)) {
    return NextResponse.json({ error: "Calendar download is unavailable for this booking." }, { status: 400 });
  }

  const serviceName = Array.isArray(row.service)
    ? (row.service[0]?.name ?? "Service")
    : (row.service?.name ?? "Service");
  const branch = Array.isArray(row.branch) ? row.branch[0] : row.branch;
  const location = [branch?.name, branch?.address, branch?.city, branch?.country]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(", ");
  const manageUrl = `${new URL(request.url).origin}/customer/bookings/${row.id}`;
  const description = [
    `Booking ID: ${row.id}`,
    `Manage booking: ${manageUrl}`,
  ].join("\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BROWZ//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${row.id}@browz.app`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(row.starts_at)}`,
    `DTEND:${toIcsDate(row.ends_at)}`,
    `SUMMARY:${escapeIcsText(`${serviceName} appointment`)}`,
    `LOCATION:${escapeIcsText(location || branch?.city || "Château Glow")}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"booking-${row.id}.ics\"`,
      "Cache-Control": "private, no-store",
    },
  });
}
