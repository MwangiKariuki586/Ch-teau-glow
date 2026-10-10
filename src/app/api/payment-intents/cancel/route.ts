import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripeServer } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

const cancelPaymentIntentSchema = z.object({
  payment_intent_id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = cancelPaymentIntentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { payment_intent_id } = validation.data;

    // Cancel the payment intent in Stripe
    const stripe = getStripeServer();
    await stripe.paymentIntents.cancel(payment_intent_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment intent cancellation error:", error);
    
    // Return success even on error - cancellation is best-effort
    return NextResponse.json({ success: true });
  }
}
