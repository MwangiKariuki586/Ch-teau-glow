import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomerOrderBySessionId } from "@/features/customer/orders/lib/customer-orders-data";

type Params = Promise<{ sessionId: string }>;

export async function GET(_: Request, { params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const order = await getCustomerOrderBySessionId(user.id, sessionId);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ data: order }, { status: 200 });
}
