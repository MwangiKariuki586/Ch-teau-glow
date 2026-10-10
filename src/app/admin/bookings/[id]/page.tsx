import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

export default async function AdminBookingRedirectPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  redirect(`/admin/bookings?bookingId=${encodeURIComponent(id)}`);
}
