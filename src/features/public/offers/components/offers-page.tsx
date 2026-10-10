import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getActiveOfferSections,
  getActivePackages,
  OffersDataError,
  type OfferSectionRecord,
  type PackageRecord,
  formatMoney,
} from "../lib/offers-data";
import { BeautyMembershipsSection } from "./beauty-memberships-section";
import { OffersSectionsClient } from "./offers-sections-client";

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1920&q=80";
const FALLBACK_CARD_IMAGE =
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80";

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center text-stone-500">
      <h3 className="text-2xl font-serif text-stone-900 mb-3">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7">{message}</p>
    </div>
  );
}

function buildPackageHref(pkg: PackageRecord) {
  const primaryService = pkg.services[0];

  if (!primaryService?.slug) {
    return `/services?package=${encodeURIComponent(pkg.slug)}`;
  }

  return `/book?package=${encodeURIComponent(pkg.slug)}&service=${encodeURIComponent(primaryService.slug)}`;
}

function packageIncludes(items: PackageRecord["services"]) {
  return items.map((item) =>
    item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name,
  );
}

function PackageSplitCard({
  pkg,
  ctaLabel,
}: {
  pkg: PackageRecord;
  ctaLabel: string;
}) {
  const includes = packageIncludes(pkg.services);
  const visibleIncludes = includes.slice(0, 3);
  const remaining = Math.max(0, includes.length - visibleIncludes.length);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm sm:flex-row">
      {/* Image */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden sm:h-auto sm:w-40 lg:w-52">
        <Image
          src={pkg.image_url || FALLBACK_CARD_IMAGE}
          alt={pkg.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5 lg:p-6">
        {/* Name + badge */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-lg font-serif text-stone-900 sm:text-xl">
            {pkg.name}
          </h3>
          {(pkg.save_label || pkg.badge) && (
            <span className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-semibold text-[#6B4423]">
              {pkg.save_label ?? pkg.badge}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-stone-900 sm:text-xl">
            {formatMoney(pkg.price_cents, pkg.currency)}
          </span>
          {pkg.compare_at_cents ? (
            <span className="text-sm text-stone-400 line-through">
              {formatMoney(pkg.compare_at_cents, pkg.currency)}
            </span>
          ) : null}
        </div>

        {/* Description */}
        <p className="mb-3 text-sm leading-6 text-stone-600 font-light line-clamp-2 sm:line-clamp-none">
          {pkg.description}
        </p>

        {/* Includes */}
        <div className="mb-4 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
            Includes
          </p>
          <ul className="space-y-1 text-sm text-stone-600">
            {visibleIncludes.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-[#C9A96E]" />
                {item}
              </li>
            ))}
            {remaining > 0 && (
              <li className="font-semibold text-[#6B4423]">+{remaining} more</li>
            )}
          </ul>
        </div>

        <Link
          href={buildPackageHref(pkg)}
          className="mt-auto inline-flex h-10 items-center justify-center rounded-full bg-[#6B4423] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4E301D]"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export async function OffersPage() {
  let curated: PackageRecord[] = [];
  let plan: PackageRecord[] = [];
  let offers: OfferSectionRecord[] = [];
  let loadError: string | null = null;

  try {
    const [packages, offerSections] = await Promise.all([
      getActivePackages(),
      getActiveOfferSections({ railLimit: 5 }),
    ]);

    curated = packages.curated;
    plan = packages.plan;
    offers = offerSections;
  } catch (error) {
    console.error("Error loading offers page data:", error);
    loadError =
      error instanceof OffersDataError
        ? error.message
        : "We're having trouble loading offers right now. Please check your connection and try again.";
  }

  return (
    <main className="min-h-screen bg-[#F9F5F0] pt-20">
      {/* Hero Section */}
      <section className="py-12 bg-[#F9F5F0]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-xs font-semibold uppercase tracking-widest mb-4">
              Exclusive for our clients
            </span>
            <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-4">
              Packages &amp; Offers
            </h1>
            <p className="text-stone-500 max-w-2xl mx-auto font-light text-lg">
              Exclusive combinations and seasonal promotions for our valued clients.
            </p>
          </div>
        </div>
      </section>

      {/* Offers Sections */}
      <section className="py-8 bg-[#F9F5F0]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {loadError ? (
            <EmptyState
              title="Offers unavailable"
              message={`${loadError} The page still preserves the existing checkout logic, but the offer catalogue could not be loaded.`}
            />
          ) : offers.length === 0 ? (
            <EmptyState
              title="No active offers yet"
              message="When active offers are configured, each one will appear here with a preview rail of eligible services."
            />
          ) : (
            <OffersSectionsClient offers={offers} />
          )}
        </div>
      </section>

      {/* Curated Packages */}
      <section className="py-12 bg-[#F9F5F0]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="mb-8 text-3xl font-serif text-stone-900">
            Curated Packages
          </h2>
          {loadError ? (
            <EmptyState
              title="Packages unavailable"
              message="Package data could not be loaded from Supabase."
            />
          ) : curated.length === 0 ? (
            <EmptyState
              title="No curated packages yet"
              message="Curated packages will appear here as soon as they are activated."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {curated.map((pkg) => (
                <PackageSplitCard
                  key={pkg.id}
                  pkg={pkg}
                  ctaLabel="Book package"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Beauty Memberships */}
      <BeautyMembershipsSection plan={plan} loadError={loadError} />

      {/* CTA Section */}
      <section className="w-full pb-12 pt-4">
        <div className="px-4 sm:px-8 lg:px-[55px]">
          <div className="relative overflow-hidden rounded-2xl bg-[#6B4423] shadow-lg">
            <div className="grid grid-cols-1 gap-6 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-2 md:items-center lg:px-16 lg:py-12">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                  Loyalty Programme
                </p>
                <h3 className="mb-3 text-2xl font-serif text-white sm:text-3xl">
                  Earn points on every visit
                </h3>
                <p className="text-sm leading-relaxed text-white/80 sm:text-base font-light">
                  Every AED spent earns points redeemable on future treatments. Members also get earlier access to selected seasonal offers.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-white px-7 text-sm font-semibold text-[#6B4423] shadow-md transition hover:bg-stone-50"
                >
                  <Link href="/auth/signup">Join Now</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full border border-white/40 bg-transparent px-7 text-sm font-medium text-white transition hover:border-white/70 hover:bg-white/10"
                >
                  <Link href="/consultation">Free Consultation</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
