import { redirect } from "next/navigation";
import { CustomerBookings } from "@/features/customer/bookings";
import { createClient } from "@/lib/supabase/server";
import { getCustomerBookings } from "@/features/customer/bookings/lib/customer-bookings-data";

export default async function CustomerBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const bookings = await getCustomerBookings(user.id);
  return <CustomerBookings bookings={bookings} />;
}
