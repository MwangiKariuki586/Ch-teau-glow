import { NextResponse } from "next/server";
import { getPublishedServiceByIdentifier } from "@/features/public/services/lib/service-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const service = await getPublishedServiceByIdentifier(slug);

  if (!service) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  return NextResponse.json({ data: service });
}
