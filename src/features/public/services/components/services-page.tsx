import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscountedServiceCard } from "@/features/public/offers/components/discounted-service-card";
import { buildOfferServicesHref } from "@/features/public/offers/components/offer-linking";
import { PromoContextBanner } from "@/features/public/shared/components/promo-context-banner";
import {
  appendPromoContext,
  getPromoContextFromSearchParams,
} from "@/features/public/shared/promo-context";
import {
  getPublishedServices,
  getActiveServiceCategories,
} from "@/features/public/services/lib/service-data";
import {
  formatMoney,
  getActivePackageBySlug,
  getEligibleServicesForOffer,
} from "@/features/public/offers/lib/offers-data";
import { ServicesClientShell } from "./services-client-shell";
import type { ServiceCatalogueCardItem } from "./service-catalogue-card";

type ServicesPageSearchParams = {
  category?: string;
  q?: string;
  offer?: string;
  code?: string;
  package?: string;
  page?: string;
};

const CATEGORY_ALIASES: Record<string, string> = {
  makeup: "semi-permanent-makeup",
  "semi-permanent-makeup": "semi-permanent-makeup",
  grooming: "grooming-services",
  "laser-treatments": "laser",
};

function normalizeCategoryValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

export async function ServicesPage({
  searchParams,
}: {
  searchParams?: ServicesPageSearchParams;
}) {
  const packageSlug = searchParams?.package?.trim() || null;
  const offerId = searchParams?.offer?.trim() || null;
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const [categories, serviceResult, selectedPackage] = await Promise.all([
    getActiveServiceCategories(),
    offerId
      ? Promise.resolve(null)
      : getPublishedServices({ page: 1, pageSize: 200 }),
    packageSlug ? getActivePackageBySlug(packageSlug) : Promise.resolve(null),
  ]);

  const categoryNames = categories
    .filter((c) => c.name.toLowerCase() !== "consultations")
    .map((c) => c.name);

  const requestedCategory = searchParams?.category?.trim();
  const normalizedRequestedCategory = requestedCategory
    ? (CATEGORY_ALIASES[normalizeCategoryValue(requestedCategory)] ??
      normalizeCategoryValue(requestedCategory))
    : null;
  const initialCategory =
    normalizedRequestedCategory &&
    categories.find((category) => {
      return (
        normalizeCategoryValue(category.slug) === normalizedRequestedCategory ||
        normalizeCategoryValue(category.name) === normalizedRequestedCategory
      );
    })?.name;
  const promoContext = getPromoContextFromSearchParams(searchParams);
  const packageServiceOrder = new Map(
    (selectedPackage?.services ?? []).map((service, index) => [
      service.id,
      index,
    ]),
  );

  const services: ServiceCatalogueCardItem[] = (serviceResult?.services ?? [])
    .filter((s) => (selectedPackage ? packageServiceOrder.has(s.id) : true))
    .filter((s) => s.category?.name?.toLowerCase() !== "consultations")
    .sort((a, b) => {
      if (!selectedPackage) return 0;
      return (
        (packageServiceOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (packageServiceOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
      );
    })
    .map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category?.name ?? "Uncategorized",
      description: s.description,
      price:
        s.min_price_cents === s.max_price_cents
          ? formatMoney(s.min_price_cents, s.currency)
          : `${formatMoney(s.min_price_cents, s.currency)} - ${formatMoney(s.max_price_cents, s.currency)}`,
      durationMinutes: Number(s.duration_minutes) || 0,
      image: s.cover_image_url,
      detailHref: appendPromoContext(`/services/${s.slug}`, promoContext),
      bookingHref: appendPromoContext("/book", promoContext, {
        service: s.slug,
      }),
      isFeatured: s.is_featured,
    }));

  const offerResult = offerId
    ? await getEligibleServicesForOffer({
        offerId,
        q: searchParams?.q,
        page,
        pageSize: 12,
      }).catch((error) => {
        console.error("Error loading offer services:", error);
        return null;
      })
    : null;

  return (
    <main className="min-h-screen bg-[#F9F5F0] pt-20">
      {/* Hero Section */}
      <section className="py-12 bg-[#F9F5F0]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-4">
              Service Catalogue
            </h1>
            <p className="text-stone-500 max-w-2xl mx-auto font-light text-lg">
              Explore our comprehensive range of luxury beauty treatments.
            </p>
          </div>
        </div>
      </section>

      {promoContext ? (
        <section className="bg-[#F9F5F0] px-6 pb-8 sm:px-[55px]">
          <PromoContextBanner
            code={promoContext.code}
            packageSlug={promoContext.packageSlug}
          />
        </section>
      ) : null}

      {offerId && !offerResult ? (
        <section className="bg-[#F9F5F0] px-6 py-10 sm:px-[55px]">
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto max-w-md">
              <h2 className="mb-3 text-2xl font-serif text-stone-900">
                Unable to Load Offer
              </h2>
              <p className="mb-6 text-sm leading-7 text-stone-500">
                We're having trouble loading this offer right now. This might be
                due to a connection issue or the offer may no longer be
                available.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/services"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#6B4423] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4E301D]"
                >
                  Browse All Services
                </Link>
                <Link
                  href="/offers"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-stone-200 px-6 text-sm font-semibold text-stone-600 transition-colors hover:bg-white"
                >
                  View Active Offers
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : offerResult ? (
        <section className="bg-[#F9F5F0] px-6 py-10 sm:px-[55px]">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B4423]">
                  Eligible services
                </p>
                <h2 className="mt-2 text-3xl font-serif text-stone-900">
                  {offerResult.offer.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-500">
                  {offerResult.offer.subtitle ??
                    offerResult.offer.eligibility_summary ??
                    "Only services eligible for this offer are shown here."}
                </p>
              </div>
              <div className="text-sm font-medium text-stone-500">
                {offerResult.total} eligible service
                {offerResult.total === 1 ? "" : "s"}
              </div>
            </div>

            <form
              className="flex flex-col gap-3 sm:flex-row"
              action="/services"
            >
              <input type="hidden" name="offer" value={offerResult.offer.id} />
              {offerResult.offer.code ? (
                <input
                  type="hidden"
                  name="code"
                  value={offerResult.offer.code}
                />
              ) : null}
              {offerResult.offer.packageSlug ? (
                <input
                  type="hidden"
                  name="package"
                  value={offerResult.offer.packageSlug}
                />
              ) : null}
              <input
                type="search"
                name="q"
                defaultValue={offerResult.query}
                placeholder="Search eligible services"
                className="h-11 flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 text-sm text-stone-600"
              />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#6B4423] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4E301D]"
              >
                Search
              </button>
              <Link
                href={buildOfferServicesHref(offerResult.offer)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-stone-200 px-5 text-sm font-semibold text-stone-600 transition-colors hover:bg-white"
              >
                Reset
              </Link>
            </form>
          </div>

          {offerResult.services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center text-stone-500">
              No eligible services match this search.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {offerResult.services.map((service) => (
                <DiscountedServiceCard
                  key={service.id}
                  offer={offerResult.offer}
                  service={service}
                />
              ))}
            </div>
          )}

          {offerResult.totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-between text-sm text-stone-500">
              <span>
                Page {offerResult.page} of {offerResult.totalPages}
              </span>
              <div className="flex gap-3">
                <Link
                  href={appendPromoContext(
                    `/services?page=${Math.max(1, offerResult.page - 1)}`,
                    {
                      offerId: offerResult.offer.id,
                      code: offerResult.offer.code,
                      packageSlug: offerResult.offer.packageSlug,
                    },
                    offerResult.query ? { q: offerResult.query } : undefined,
                  )}
                  className={`rounded-full border border-stone-200 px-4 py-2 font-semibold ${
                    offerResult.page <= 1
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  Previous
                </Link>
                <Link
                  href={appendPromoContext(
                    `/services?page=${Math.min(
                      offerResult.totalPages,
                      offerResult.page + 1,
                    )}`,
                    {
                      offerId: offerResult.offer.id,
                      code: offerResult.offer.code,
                      packageSlug: offerResult.offer.packageSlug,
                    },
                    offerResult.query ? { q: offerResult.query } : undefined,
                  )}
                  className={`rounded-full bg-[#6B4423] px-4 py-2 font-semibold text-white ${
                    offerResult.page >= offerResult.totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <ServicesClientShell
          services={services}
          categories={categoryNames}
          initialCategory={initialCategory ?? "All"}
          initialQuery={searchParams?.q ?? ""}
        />
      )}

      <section className="w-full pb-12 pt-4">
        <div className="px-4 sm:px-8 lg:px-[55px]">
          <div className="relative overflow-hidden rounded-2xl bg-[#6B4423] shadow-lg">
            <div className="grid grid-cols-1 gap-6 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-2 md:items-center lg:px-16 lg:py-12">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                  Personalised Wellness
                </p>
                <h3 className="mb-3 text-2xl font-serif text-white sm:text-3xl">
                  Need a Personalised Treatment Plan?
                </h3>
                <p className="text-sm leading-relaxed text-white/80 sm:text-base font-light">
                  Speak with our specialists to choose the right combination of
                  treatments based on your skin goals and timeline.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-white px-7 text-sm font-semibold text-[#6B4423] shadow-md transition hover:bg-stone-50"
                >
                  <Link href="/consultation">Book Consultation</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full border border-white/40 bg-transparent px-7 text-sm font-medium text-white transition hover:border-white/70 hover:bg-white/10"
                >
                  <Link href="/about">Learn About Château Glow</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
