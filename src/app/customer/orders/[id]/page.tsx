import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerOrderById } from "@/features/customer/orders/lib/customer-orders-data";
import { CustomerOrderDetail } from "@/features/customer/orders/components/customer-order-detail";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CustomerOrderDetailPage({
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

  const order = await getCustomerOrderById(user.id, id);
  if (!order) {
    notFound();
  }

  const checkoutStatus = Array.isArray(resolvedSearchParams.checkout)
    ? resolvedSearchParams.checkout[0]
    : resolvedSearchParams.checkout;
  const sessionIdFromQuery = Array.isArray(resolvedSearchParams.session_id)
    ? resolvedSearchParams.session_id[0]
    : resolvedSearchParams.session_id;

  return (
    <CustomerOrderDetail
      initialOrder={order}
      sessionId={sessionIdFromQuery ?? order.stripeCheckoutSessionId}
      checkoutSucceeded={checkoutStatus === "success"}
    />
  );
}
