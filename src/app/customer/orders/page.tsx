import { redirect } from "next/navigation";
import { CustomerOrders } from "@/features/customer/orders";
import { createClient } from "@/lib/supabase/server";
import { getCustomerOrders } from "@/features/customer/orders/lib/customer-orders-data";

export default async function CustomerOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const orders = await getCustomerOrders(user.id);
  return <CustomerOrders orders={orders} />;
}
