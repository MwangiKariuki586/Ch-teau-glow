import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutSuccessContent } from "@/features/public/shop/components/checkout-success-content";
import { getCustomerOrderById } from "@/features/customer/orders/lib/customer-orders-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const orderId = Array.isArray(params.order_id) ? params.order_id[0] : params.order_id;
  const sessionId = Array.isArray(params.session_id) ? params.session_id[0] : params.session_id;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const order = orderId ? await getCustomerOrderById(user.id, orderId) : null;
  return <CheckoutSuccessContent initialOrder={order} sessionId={sessionId ?? null} />;
}
