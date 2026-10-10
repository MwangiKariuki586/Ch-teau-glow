"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PackageRecord } from "../lib/offers-data";

type BillingInterval = "monthly" | "quarterly";

// Map package name to tier slug for checkout
function getTierSlugFromPackageName(name: string): string {
  const normalizedName = name.trim().toLowerCase();

  if (normalizedName.includes("starter")) {
    return "starter";
  }

  if (normalizedName.includes("radiance")) {
    return "radiance";
  }

  if (normalizedName.includes("luxury")) {
    return "luxury";
  }

  // Default to starter if no match
  return "starter";
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center text-stone-500">
      <h3 className="text-2xl font-serif text-stone-900 mb-3">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7">{message}</p>
    </div>
  );
}

function BillingToggle({
  selected,
  onChange,
}: {
  selected: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-stone-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => onChange("monthly")}
        className={`rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${
          selected === "monthly"
            ? "bg-[#6B4423] text-white shadow-sm"
            : "text-stone-600 hover:text-stone-900"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("quarterly")}
        className={`rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${
          selected === "quarterly"
            ? "bg-[#6B4423] text-white shadow-sm"
            : "text-stone-600 hover:text-stone-900"
        }`}
      >
        Quarterly <span className="ml-1 text-xs">(save 10%)</span>
      </button>
    </div>
  );
}

function MembershipCard({
  pkg,
  ctaLabel,
  featured = false,
  exclusive = false,
  billingInterval,
}: {
  pkg: PackageRecord;
  ctaLabel: string;
  featured?: boolean;
  exclusive?: boolean;
  billingInterval: BillingInterval;
}) {
  // Derive quarterly pricing (10% discount)
  const monthlyPrice = pkg.price_cents;
  const quarterlyPrice = Math.round((monthlyPrice * 3 * 0.9) / 100) * 100;

  const displayPrice =
    billingInterval === "monthly" ? monthlyPrice : quarterlyPrice;
  const priceLabel = billingInterval === "monthly" ? "/ month" : "/ quarter";

  // Membership benefits (replacing bundle includes)
  const membershipBenefits = [
    "Up to 10% off eligible services",
    "Priority booking windows",
    "1 complimentary add-on monthly (selected)",
    "Early access to seasonal offers",
    "Dedicated support & faster reschedule",
    ...(featured || exclusive ? ["Birthday perk on eligible bookings"] : []),
    ...(exclusive ? ["VIP concierge-style assistance"] : []),
  ];

  const badgeText = exclusive
    ? "Exclusive"
    : featured
      ? "Most popular"
      : pkg.badge || "Starter";
  const badgeColor = exclusive
    ? "border-[#C9A96E]/40 bg-[#C9A96E]/15 text-[#6B4423]"
    : featured
      ? "border-[#6B4423]/30 bg-[#6B4423] text-white"
      : "border-stone-200 bg-stone-50 text-[#6B4423]";

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        featured
          ? "border-[#C9A96E]/60 bg-[linear-gradient(180deg,#fffdf9_0%,#fff8ef_100%)] shadow-md"
          : exclusive
            ? "border-[#C9A96E]/50 shadow-md"
            : "border-stone-200 shadow-sm"
      }`}
    >
      {featured && (
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(201,169,110,0.18),transparent_72%)]" />
      )}
      {exclusive && (
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(201,169,110,0.12),transparent_72%)]" />
      )}

      <div className="relative flex flex-1 flex-col p-4 sm:p-6">
        {/* Badge */}
        <div className="mb-3 sm:mb-4">
          <span
            className={`inline-block rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeColor}`}
          >
            {badgeText}
          </span>
        </div>

        {/* Plan name & tagline */}
        <div className="mb-4 sm:mb-5">
          <h3 className="mb-1.5 text-xl font-serif tracking-tight text-stone-900 sm:text-2xl">
            {pkg.name}
          </h3>
          <p className="text-sm leading-6 text-stone-600 font-light">
            {pkg.description ||
              "A membership plan that fits your beauty routine"}
          </p>
        </div>

        {/* Price */}
        <div className="mb-5 sm:mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-stone-500">{pkg.currency}</span>
            <span className="text-3xl font-bold text-stone-900 sm:text-4xl">
              {Math.floor(displayPrice / 100)}
            </span>
            <span className="text-sm text-stone-600">{priceLabel}</span>
          </div>
          <p className="mt-1.5 text-xs text-stone-500">
            Membership billing (preview)
          </p>
        </div>

        {/* Benefits list */}
        <div className="mb-5 flex-1 sm:mb-6">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 sm:mb-3">
            Membership benefits
          </p>
          <ul className="space-y-2.5 sm:space-y-3">
            {membershipBenefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2.5 text-sm leading-6 text-stone-700 sm:gap-3"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[#6B4423]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Link
          href={`/membership/${getTierSlugFromPackageName(pkg.name)}/checkout`}
          className="block w-full rounded-full bg-[#6B4423] py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#4A2C1A] sm:py-3"
        >
          {ctaLabel}
        </Link>

        {/* Fine print */}
        <div className="mt-4 border-t border-stone-200 pt-3 sm:mt-5 sm:pt-4">
          <p className="text-xs leading-relaxed text-stone-500">
            Benefits apply to eligible services. Terms apply.
          </p>
        </div>
      </div>
    </div>
  );
}

export function BeautyMembershipsSection({
  plan,
  loadError,
}: {
  plan: PackageRecord[];
  loadError: string | null;
}) {
  const [billingInterval, setBillingInterval] =
    React.useState<BillingInterval>("monthly");

  return (
    <section className="py-12 bg-[#F9F5F0]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section header */}
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-serif text-stone-900">
            Beauty Memberships
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-stone-600 font-light sm:text-base">
            Choose a plan that fits your routine. Enjoy priority booking, member
            pricing, and exclusive perks across the Château Glow experience.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mb-8 flex justify-center overflow-x-auto">
          <BillingToggle
            selected={billingInterval}
            onChange={setBillingInterval}
          />
        </div>

        {/* Membership cards */}
        {loadError ? (
          <EmptyState
            title="Beauty memberships unavailable"
            message="Package data could not be loaded from Supabase."
          />
        ) : plan.length === 0 ? (
          <EmptyState
            title="No beauty memberships yet"
            message="Run the seed file or insert active plan rows in Supabase to populate this section."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {plan.map((pkg, index) => (
              <MembershipCard
                key={pkg.id}
                pkg={pkg}
                ctaLabel="Explore Plan"
                featured={index === 1}
                exclusive={index === 2}
                billingInterval={billingInterval}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
