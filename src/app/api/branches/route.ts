import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookableBranchesForService } from "@/features/public/services/lib/service-data";

const querySchema = z.object({
  service_id: z.string().uuid(),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const branches = await getBookableBranchesForService(
    parsed.data.service_id,
    parsed.data.limit ?? 20,
  );

  return NextResponse.json({ data: branches });
}
