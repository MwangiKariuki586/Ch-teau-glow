import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailsPage } from "@/features/public/services";
import { getPromoContextFromSearchParams } from "@/features/public/shared/promo-context";
import {
  getBranchesForService,
  getPublishedReviewsForService,
  getPublishedServiceBySlug,
  getRelatedServices,
  getSpecialistsForService,
} from "@/features/public/services/lib/service-data";

type RouteParams = Promise<{ slug: string }>;
type SearchParams = Promise<{
  branch?: string;
  offer?: string;
  code?: string;
  package?: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublishedServiceBySlug(slug);

  if (!service) {
    return {
      title: "Service Not Found | Château Glow",
      description: "The requested service is unavailable.",
    };
  }

  const image =
    service.cover_image_url ||
    "https://images.unsplash.com/photo-1526758097130-bab247274f58?w=1200&q=80";
  const description =
    service.description ??
    service.details?.what_is_it ??
    `${service.name} at Château Glow premium beauty and wellness clinic.`;

  return {
    title: `${service.name} | Château Glow Services`,
    description,
    openGraph: {
      title: `${service.name} | Château Glow`,
      description,
      images: [image],
      type: "article",
    },
  };
}

export default async function ServiceDetailsRoutePage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const selectedBranchId = query.branch ?? null;
  const promoContext = getPromoContextFromSearchParams(query);

  const service = await getPublishedServiceBySlug(slug);
  if (!service) notFound();

  const [branches, specialists, relatedServices, reviews] = await Promise.all([
    getBranchesForService(service.id, 3),
    getSpecialistsForService({
      serviceId: service.id,
      branchId: selectedBranchId,
    }),
    getRelatedServices({
      categoryId: service.category_id,
      excludeServiceId: service.id,
      limit: 4,
    }),
    getPublishedReviewsForService(service.id, 8),
  ]);

  return (
    <ServiceDetailsPage
      service={service}
      branches={branches}
      specialists={specialists}
      relatedServices={relatedServices}
      reviews={reviews}
      selectedBranchId={selectedBranchId}
      promoContext={promoContext}
    />
  );
}
