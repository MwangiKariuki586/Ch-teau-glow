import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeInfo,
  CalendarCheck,
  Clock,
  Clock3,
  Sparkles,
  Star,
  Waves,
} from "lucide-react";
import { PromoContextBanner } from "@/features/public/shared/components/promo-context-banner";
import {
  appendPromoContext,
  type PromoContext,
} from "@/features/public/shared/promo-context";
import { FavoriteButton } from "@/features/shared/favorite-button";
import {
  ServiceCatalogueCard,
  type ServiceCatalogueCardItem,
} from "@/features/public/services/components/service-catalogue-card";
import {
  formatMoney,
  type BranchSummary,
  type ServiceDetailsRecord,
  type ServiceReviewSummary,
  type ServiceSummary,
  type SpecialistSummary,
} from "@/features/public/services/lib/service-data";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1526758097130-bab247274f58?w=1400&q=80";

interface ServiceDetailsPageProps {
  service: ServiceDetailsRecord;
  branches: BranchSummary[];
  specialists: SpecialistSummary[];
  relatedServices: ServiceSummary[];
  reviews: ServiceReviewSummary[];
  selectedBranchId?: string | null;
  promoContext?: PromoContext | null;
}

function withFallback(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function priceRangeLabel(service: ServiceSummary) {
  if (service.min_price_cents === service.max_price_cents) {
    return formatMoney(service.min_price_cents, service.currency);
  }
  return `${formatMoney(service.min_price_cents, service.currency)} - ${formatMoney(service.max_price_cents, service.currency)}`;
}

function detailIcon(key: string, label: string) {
  const value = `${key} ${label}`.toLowerCase();
  if (value.includes("procedure") || value.includes("time")) return Clock3;
  if (value.includes("duration") || value.includes("recovery")) return Sparkles;
  if (value.includes("discomfort")) return AlertTriangle;
  if (value.includes("downtime")) return Waves;
  return BadgeInfo;
}

export function ServiceDetailsPage({
  service,
  branches,
  specialists,
  relatedServices,
  reviews,
  selectedBranchId,
  promoContext,
}: ServiceDetailsPageProps) {
  const priceLabel = priceRangeLabel(service);

  const reviewCount = reviews.length > 0 ? reviews.length : service.rating_count;
  const reviewAvg =
    service.rating_average !== null
      ? service.rating_average
      : reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : null;
  const roundedAvg = reviewAvg !== null ? Math.round(reviewAvg * 10) / 10 : null;

  const whatIsIt = withFallback(
    service.details?.what_is_it,
    `${service.name} is a non-invasive treatment that supports firmer, smoother skin with a clinical and personalized approach.`,
  );
  const whoFor = withFallback(
    service.details?.who_is_it_for,
    "Individuals with mild to moderate skin laxity and those looking for non-surgical support for fine lines and skin texture concerns.",
  );
  const whoNotFor = withFallback(
    service.details?.who_is_it_not_for,
    "People with severe skin laxity requiring surgery, active skin conditions, or those who are pregnant or breastfeeding.",
  );

  const requiredItems = [
    {
      detail_key: "procedure_time",
      display_label: "Procedure Time",
      detail_value:
        service.duration_minutes > 0
          ? `${service.duration_minutes} minutes`
          : "Duration depends on your provider assessment.",
      display_order: 10,
    },
    {
      detail_key: "results_duration",
      display_label: "Results Duration",
      detail_value: "Results timeline varies by treatment plan and skin response.",
      display_order: 20,
    },
    {
      detail_key: "discomfort_level",
      display_label: "Discomfort Level",
      detail_value: "Comfort levels vary by individual and treatment area.",
      display_order: 30,
    },
    {
      detail_key: "side_effects",
      display_label: "Side Effects",
      detail_value: "Possible temporary redness, sensitivity, or mild swelling may occur.",
      display_order: 40,
    },
    {
      detail_key: "recovery_duration",
      display_label: "Recovery Duration",
      detail_value: "Recovery expectations depend on treatment depth and skin profile.",
      display_order: 45,
    },
    {
      detail_key: "downtime",
      display_label: "Downtime",
      detail_value: "Downtime varies by treatment; many services allow a quick return to routine.",
      display_order: 50,
    },
  ];

  const normKey: Record<string, string> = {
    duration: "results_duration",
    side_effect: "side_effects",
    full_recovery: "recovery_duration",
  };
  const normLabel: Record<string, string> = {
    results_duration: "Results Duration",
    discomfort_level: "Discomfort Level",
    side_effects: "Side Effects",
    recovery_duration: "Recovery Duration",
    downtime: "Downtime",
  };

  const dynamic = [...(service.detail_items ?? [])]
    .filter((item) => item.detail_value?.trim())
    .sort((a, b) => a.display_order - b.display_order);
  const deduped = Array.from(
    dynamic
      .reduce((acc, item) => {
        const key = normKey[item.detail_key] ?? item.detail_key;
        if (!acc.has(key)) {
          acc.set(key, {
            ...item,
            detail_key: key,
            display_label: normLabel[key] ?? item.display_label,
          });
        }
        return acc;
      }, new Map<string, typeof dynamic[number]>())
      .values(),
  );

  const detailItems = [
    ...requiredItems.map((required) => {
      const fromDb = deduped.find((item) => item.detail_key === required.detail_key);
      return fromDb
        ? {
            ...fromDb,
            display_label: withFallback(fromDb.display_label, required.display_label),
            detail_value: withFallback(fromDb.detail_value, required.detail_value),
          }
        : required;
    }),
    ...deduped.filter(
      (item) =>
        item.detail_key !== "price" &&
        !requiredItems.some((required) => required.detail_key === item.detail_key),
    ),
  ].sort((a, b) => a.display_order - b.display_order);

  const relatedCards: ServiceCatalogueCardItem[] = relatedServices.map((related) => ({
    id: related.id,
    name: related.name,
    category: related.category?.name ?? "Service",
    description: related.description,
    price: priceRangeLabel(related),
    durationMinutes: Number(related.duration_minutes) || 0,
    image: related.cover_image_url,
    detailHref: appendPromoContext(`/services/${related.slug}`, promoContext),
    bookingHref: appendPromoContext("/book", promoContext, { service: related.slug }),
    isFeatured: related.is_featured,
  }));

  void branches;
  void specialists;
  void selectedBranchId;

  return (
    <main className="min-h-screen bg-white pt-20">
      {/* Product Details Section */}
      <section className="pt-4 pb-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Breadcrumb */}
          <nav className="flex items-center text-xs text-stone-400 mb-16" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-stone-600 transition-colors">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <Link href={appendPromoContext("/services", promoContext)} className="hover:text-stone-600 transition-colors">
              Services
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-stone-600">{service.category?.name || 'Service'}</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-2">
            {/* Service Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={service.cover_image_url || FALLBACK_IMAGE}
                alt={service.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {/* Service Information */}
            <div className="flex flex-col space-y-6">
              {/* Category Badge */}
              {service.category?.name && (
                <span className="w-fit text-xs uppercase tracking-wider text-stone-500">
                  {service.category.name}
                </span>
              )}

              {/* Service Name */}
              <h1 className="text-3xl md:text-4xl font-serif text-stone-900 leading-tight">
                {service.name}
              </h1>

              {/* Rating & Duration */}
              <div className="flex items-center gap-4 text-sm text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {service.duration_minutes} min
                </span>
                {reviewCount > 0 && roundedAvg !== null && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-[#C9A96E] text-[#C9A96E]" />
                      {roundedAvg.toFixed(1)} ({reviewCount})
                    </span>
                  </>
                )}
              </div>

              {/* Price */}
              <div className="py-4 border-y border-stone-200">
                <span className="text-3xl font-bold text-stone-900">{priceLabel}</span>
              </div>

              {/* Description */}
              <div>
                <p className="text-stone-600 leading-relaxed font-light">
                  {withFallback(
                    service.description,
                    `${service.name} is a non-invasive aesthetic treatment designed to improve skin quality and confidence.`,
                  )}
                </p>
              </div>

              {/* Book Now Button */}
              <div className="pt-4">
                <Link
                  href={appendPromoContext("/book", promoContext, { service: service.slug })}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#6B4423] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4A2C1A]"
                >
                  <CalendarCheck className="h-4 w-4" /> Book Now
                </Link>
              </div>

              {/* Treatment Details */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                {detailItems.slice(0, 4).map((item) => {
                  const Icon = detailIcon(item.detail_key, item.display_label);
                  return (
                    <div key={item.detail_key} className="p-4 rounded-lg bg-stone-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-[#6B4423]" />
                        <h3 className="text-xs font-medium text-stone-900">
                          {item.display_label}
                        </h3>
                      </div>
                      <p className="text-xs text-stone-600 font-light">
                        {item.detail_value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* About This Treatment */}
          <div className="mt-16 pt-12 border-t border-stone-200">
            <h2 className="text-2xl font-serif text-stone-900 mb-8">About This Treatment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "What is it?", text: whatIsIt },
                { title: "Who is it for?", text: whoFor },
                { title: "Who is it not for?", text: whoNotFor },
              ].map(({ title, text }) => (
                <div key={title}>
                  <h3 className="text-sm font-medium text-stone-900 mb-3">{title}</h3>
                  <p className="text-sm leading-relaxed text-stone-600 font-light">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* All Treatment Details */}
          {detailItems.length > 4 && (
            <div className="mt-12">
              <h2 className="text-2xl font-serif text-stone-900 mb-6">Complete Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {detailItems.slice(4).map((item) => {
                  const Icon = detailIcon(item.detail_key, item.display_label);
                  return (
                    <div key={item.detail_key} className="flex gap-3">
                      <Icon className="h-5 w-5 text-[#6B4423] mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-stone-900 mb-1">
                          {item.display_label}
                        </h3>
                        <p className="text-sm leading-relaxed text-stone-600 font-light">
                          {item.detail_value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Client Reviews */}
          {reviews.length > 0 && (
            <div className="mt-12 pt-12 border-t border-stone-200">
              <div className="flex items-baseline justify-between mb-8">
                <h2 className="text-2xl font-serif text-stone-900">Client Reviews</h2>
                {reviewCount > 0 && roundedAvg !== null && (
                  <div className="flex items-center gap-1.5 text-sm text-stone-500">
                    <Star className="h-4 w-4 fill-[#C9A96E] text-[#C9A96E]" />
                    <span className="font-semibold text-stone-900">{roundedAvg.toFixed(1)}</span>
                    <span>({reviewCount})</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div key={review.id} className="p-6 rounded-lg border border-stone-200 bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={
                              value <= review.rating
                                ? "h-4 w-4 fill-[#C9A96E] text-[#C9A96E]"
                                : "h-4 w-4 text-stone-200"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs text-stone-400">
                        {format(new Date(review.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-stone-600 font-light">
                      {withFallback(
                        review.review_text,
                        "Customer left a rating without written feedback.",
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Related Services */}
      {relatedCards.length > 0 && (
        <section className="py-12 bg-stone-50">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="mb-8">
              <h2 className="text-2xl font-serif text-stone-900 mb-2">Related Services</h2>
              <p className="text-stone-600 font-light">
                More treatments in {service.category?.name || 'this category'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedCards.map((card) => (
                <ServiceCatalogueCard key={card.id} service={card} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile sticky booking bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-stone-200 bg-white px-4 py-3 lg:hidden shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-stone-500">{service.name}</p>
          <p className="text-base font-bold text-stone-900">{priceLabel}</p>
        </div>
        <FavoriteButton
          serviceId={service.id}
          variant="compact"
          className="h-10 w-10 shrink-0 rounded-full border border-stone-200 bg-stone-50"
        />
        <Link
          href={appendPromoContext("/book", promoContext, { service: service.slug })}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#6B4423] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4A2C1A]"
        >
          <CalendarCheck className="h-4 w-4" /> Book
        </Link>
      </div>
    </main>
  );
}
