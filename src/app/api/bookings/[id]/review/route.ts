import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review_text: z
    .string()
    .max(1000)
    .nullable()
    .optional()
    .transform((value) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      return trimmed ? trimmed : null;
    }),
});

type BookingRow = {
  id: string;
  user_id: string;
  status: string;
  service_id: string;
  branch_id: string;
  specialist_id: string;
};

type BookingReviewRow = {
  id: string;
  booking_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, supabase };
  }

  return { ok: true as const, supabase, user };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid booking id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const bookingId = parsedParams.data.id;
  const { supabase, user } = auth;

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json(
      { error: "Unable to load this booking right now. Please try again." },
      { status: 500 },
    );
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data: review, error: reviewError } = await supabase
    .from("booking_reviews")
    .select("id,booking_id,user_id,rating,review_text,status,created_at,updated_at")
    .eq("booking_id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (reviewError) {
    return NextResponse.json(
      { error: "Unable to load your review right now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      review: (review as BookingReviewRow | null) ?? null,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid booking id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    rawBody = {};
  }

  const parsedBody = createReviewSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Please provide a valid rating and optional review text." },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const bookingId = parsedParams.data.id;
  const { supabase, user } = auth;

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,user_id,status,service_id,branch_id,specialist_id")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json(
      { error: "Unable to load this booking right now. Please try again." },
      { status: 500 },
    );
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const bookingRow = booking as BookingRow;
  if (bookingRow.status !== "completed") {
    return NextResponse.json(
      { error: "You can review an appointment only after it is completed." },
      { status: 400 },
    );
  }

  const payload = {
    booking_id: bookingRow.id,
    user_id: bookingRow.user_id,
    service_id: bookingRow.service_id,
    branch_id: bookingRow.branch_id,
    specialist_id: bookingRow.specialist_id,
    rating: parsedBody.data.rating,
    review_text: parsedBody.data.review_text,
  };

  const { data: review, error: insertError } = await supabase
    .from("booking_reviews")
    .insert(payload)
    .select("id,booking_id,user_id,rating,review_text,status,created_at,updated_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existingReview } = await supabase
        .from("booking_reviews")
        .select("id,booking_id,user_id,rating,review_text,status,created_at,updated_at")
        .eq("booking_id", bookingRow.id)
        .eq("user_id", user.id)
        .maybeSingle();

      return NextResponse.json(
        {
          error: "Review already submitted for this booking.",
          data: { review: (existingReview as BookingReviewRow | null) ?? null },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "We couldn't submit your review right now. Please try again." },
      { status: 500 },
    );
  }

  revalidatePath(`/customer/bookings/${bookingRow.id}`);
  revalidatePath(`/bookings/${bookingRow.id}`);

  return NextResponse.json({
    data: {
      review: review as BookingReviewRow,
    },
  });
}
