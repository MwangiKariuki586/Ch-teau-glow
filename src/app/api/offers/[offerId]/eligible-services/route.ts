import { NextResponse } from "next/server";
import {
  getEligibleServicesForOffer,
  OffersDataError,
} from "@/features/public/offers/lib/offers-data";

export async function GET(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
) {
  try {
    const { offerId } = await context.params;
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "12");
    const q = searchParams.get("q") ?? "";

    const result = await getEligibleServicesForOffer({
      offerId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 12,
      q,
    });

    return NextResponse.json({
      services: result.services,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      query: result.query,
    });
  } catch (error) {
    const message =
      error instanceof OffersDataError
        ? error.message
        : "Unable to load eligible services.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
