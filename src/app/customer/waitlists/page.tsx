import { redirect } from "next/navigation";
import { CustomerWaitlistsPage } from "@/features/customer/waitlists/components/customer-waitlists-page";
import { getCustomerWaitlists } from "@/features/customer/waitlists/lib/customer-waitlists-data";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerWaitlistsRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { requests, offers } = await getCustomerWaitlists(user.id);

  return (
    <CustomerWaitlistsPage initialRequests={requests} initialOffers={offers} />
  );
}
