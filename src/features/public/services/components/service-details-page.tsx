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
    <main
      className="min-h-screen bg-[#F9F5F0] pt-0"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Hero */}
      <div className="relative h-[55vh] min-h-[320px] w-full md:h-[65vh] md:min-h-[480px]">
        <Image
          src={service.cover_image_url || FALLBACK_IMAGE}
          alt={service.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* Back pill */}
        <div className="absolute inset-x-0 top-16 px-4 sm:top-24 sm:px-6 lg:px-16">
          <Link
            href={appendPromoContext("/services", promoContext)}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm transition-colors hover:bg-white sm:px-4 sm:py-2 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Back to Services
          </Link>
        </div>

        {/* Title + meta */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 sm:px-6 md:pb-12 lg:px-16">
          {service.category?.name ? (
            <span className="mb-2 inline-block rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm sm:mb-3">
              {service.category.name}
            </span>
          ) : null}
          <h1
            className="mb-2 text-2xl font-bold leading-tight text-white sm:mb-3 sm:text-3xl md:text-5xl lg:text-6xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {service.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80 md:gap-5">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {service.duration_minutes} min
            </span>
            <span className="text-base font-bold text-white md:text-xl">{priceLabel}</span>
            {reviewCount > 0 && roundedAvg !== null ? (
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {roundedAvg.toFixed(1)}
                <span className="text-white/60">({reviewCount})</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="w-full px-4 py-8 pb-36 sm:px-6 md:py-14 lg:px-16 lg:pb-28">
        <PromoContextBanner
          code={promoContext?.code}
          packageSlug={promoContext?.packageSlug}
          className="mb-8"
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-14">
          {/* Left column */}
          <div className="space-y-10 md:space-y-12 lg:col-span-2">
            <div>
              <p className="text-base leading-relaxed text-gray-600 md:text-lg">
                {withFallback(
                  service.description,
                  `${service.name} is a non-invasive aesthetic treatment designed to improve skin quality and confidence.`,
                )}
              </p>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-bold text-gray-900 md:mb-6 md:text-2xl">
                About This Treatment
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                {[
                  { title: "What is it?", text: whatIsIt, accent: "border-l-[#C9A96E]" },
                  { title: "Who is it for?", text: whoFor, accent: "border-l-emerald-400" },
                  { title: "Who is it not for?", text: whoNotFor, accent: "border-l-rose-400" },
                ].map(({ title, text, accent }) => (
                  <div key={title} className={`border-l-2 pl-4 ${accent}`}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-900">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-bold text-gray-900 md:mb-6 md:text-2xl">
                Treatment Details
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                {detailItems.map((item) => {
                  const Icon = detailIcon(item.detail_key, item.display_label);
                  return (
                    <div key={item.detail_key} className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <Icon className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="mb-0.5 text-sm font-semibold text-gray-900">
                          {item.display_label}
                        </h3>
                        <p className="text-sm leading-relaxed text-gray-500">
                          {item.detail_value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-baseline justify-between md:mb-6">
                <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                  Client Reviews
                </h2>
                {reviewCount > 0 && roundedAvg !== null ? (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-gray-900">{roundedAvg.toFixed(1)}</span>
                    <span className="hidden sm:inline">
                      / 5 · {reviewCount} review{reviewCount === 1 ? "" : "s"}
                    </span>
                  </div>
                ) : null}
              </div>
              {reviews.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-white py-10 text-center">
                  <Star className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                  <p className="text-sm text-gray-400">
                    No published reviews yet. Be the first to share feedback.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5"
                      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                              key={value}
                              className={
                                value <= review.rating
                                  ? "h-4 w-4 fill-amber-400 text-amber-400"
                                  : "h-4 w-4 text-gray-200"
                              }
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">
                          {format(new Date(review.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-600">
                        {withFallback(
                          review.review_text,
                          "Customer left a rating without written feedback.",
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: sticky booking card — desktop only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-28 space-y-4">
              <div
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
              >
                <div className="bg-[#6B4423] px-6 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                    Booking Details
                  </p>
                  <p className="text-2xl font-bold text-white">{priceLabel}</p>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <div className="flex items-center justify-between border-b border-gray-100 py-3 text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {service.duration_minutes} min
                    </span>
                  </div>
                  {service.category?.name ? (
                    <div className="flex items-center justify-between border-b border-gray-100 py-3 text-sm">
                      <span className="text-gray-500">Category</span>
                      <span className="font-semibold text-gray-900">
                        {service.category.name}
                      </span>
                    </div>
                  ) : null}
                  {reviewCount > 0 && roundedAvg !== null ? (
                    <div className="flex items-center justify-between border-b border-gray-100 py-3 text-sm">
                      <span className="text-gray-500">Rating</span>
                      <span className="flex items-center gap-1 font-semibold text-gray-900">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {roundedAvg.toFixed(1)}
                      </span>
                    </div>
                  ) : null}
                  {service.is_featured ? (
                    <div className="flex items-center justify-between border-b border-gray-100 py-3 text-sm">
                      <span className="text-gray-500">Status</span>
                      <span className="rounded-full bg-[#C9A96E]/15 px-2.5 py-0.5 text-xs font-semibold text-[#C9A96E]">
                        Featured
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 px-6 pb-6">
                  <Link
                    href={appendPromoContext("/book", promoContext, { service: service.slug })}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6B4423] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4A2C1A]"
                  >
                    <CalendarCheck className="h-4 w-4" /> Book Now
                  </Link>
                  <FavoriteButton
                    serviceId={service.id}
                    variant="default"
                    showLabel
                    className="w-full justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#C9A96E]/20 bg-[#C9A96E]/10 px-5 py-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6B4423]">
                  Signature Treatment
                </p>
                <p className="text-sm leading-relaxed text-gray-600">
                  Book with confidence. All treatments are delivered by certified specialists.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related services */}
        {relatedCards.length > 0 ? (
          <div className="mt-12 border-t border-gray-200 pt-8 md:mt-20 md:pt-12">
            <div className="mb-5 flex items-baseline justify-between md:mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 md:text-3xl">
                  Related Services
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Explore treatments in the same category as {service.name}.
                </p>
              </div>
              <Link
                href={appendPromoContext("/services", promoContext)}
                className="ml-4 whitespace-nowrap text-sm font-medium text-[#6B4423] hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {relatedCards.map((card) => (
                <ServiceCatalogueCard key={card.id} service={card} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile sticky booking bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 lg:hidden"
        style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-gray-500">{service.name}</p>
          <p className="text-base font-bold text-gray-900">{priceLabel}</p>
        </div>
        <FavoriteButton
          serviceId={service.id}
          variant="compact"
          className="h-10 w-10 shrink-0 rounded-full border border-gray-200 bg-gray-50"
        />
        <Link
          href={appendPromoContext("/book", promoContext, { service: service.slug })}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#6B4423] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4A2C1A]"
        >
          <CalendarCheck className="h-4 w-4" /> Book Now
        </Link>
      </div>
    </main>
  );
}