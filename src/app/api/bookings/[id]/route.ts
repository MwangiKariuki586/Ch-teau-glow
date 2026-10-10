import { NextResponse } from "next/server";
import { z } from "zod";
import { POST as cancelBooking } from "./cancel/route";

const patchSchema = z.object({
  status: z.literal("cancelled"),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const rawBody = await request.json().catch(() => null);
  const parsedBody = patchSchema.safeParse(rawBody);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error:
          "Invalid payload. Use POST /api/bookings/[id]/cancel with optional reason.",
        issues: parsedBody.error.issues,
      },
      { status: 400 },
    );
  }

  const forwardedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ reason: parsedBody.data.reason }),
  });

  return cancelBooking(forwardedRequest, context);
}
