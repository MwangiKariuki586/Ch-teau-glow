import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPublishedServices } from "@/features/public/services/lib/service-data";

const listQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  branch: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minDuration: z.string().optional(),
  maxDuration: z.string().optional(),
  featured: z.string().optional(),
  discomfortLevel: z.string().optional(),
  withSideEffects: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(48).optional(),
});

function parseOptionalNonNegativeNumber(value?: string) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await getPublishedServices({
    q: parsed.data.q,
    category: parsed.data.category,
    branch: parsed.data.branch,
    minPrice: parseOptionalNonNegativeNumber(parsed.data.minPrice),
    maxPrice: parseOptionalNonNegativeNumber(parsed.data.maxPrice),
    minDuration: parseOptionalNonNegativeNumber(parsed.data.minDuration),
    maxDuration: parseOptionalNonNegativeNumber(parsed.data.maxDuration),
    featured: parsed.data.featured === "true",
    discomfortLevel: parsed.data.discomfortLevel,
    withSideEffects: parsed.data.withSideEffects === "true",
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return NextResponse.json({
    data: result.services,
    pagination: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages,
      hasNextPage: result.page < totalPages,
      hasPreviousPage: result.page > 1,
    },
  });
}
