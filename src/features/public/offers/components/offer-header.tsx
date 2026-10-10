"use client";

import Link from "next/link";
import { CopyCodeButton } from "@/features/public/shared/components/copy-code-button";
import type { OfferSectionRecord } from "../lib/offers-data";
import { EligibleServicesDrawer } from "./eligible-services-drawer";
import { buildOfferServicesHref } from "./offer-linking";

export function OfferHeader({ offer }: { offer: OfferSectionRecord }) {
  const visibleChips = offer.chips.slice(0, 2);
  const hiddenChipCount = Math.max(0, offer.chips.length - visibleChips.length);
  const viewAllHref = buildOfferServicesHref(offer);

  return (
    <header className="border-b border-[#E7DBCF] pb-4">
      {/* Row 1: badge + title + validity */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3">
        <span className="inline-flex shrink-0 rounded-full bg-[#6B4423] px-3 py-1 text-xs font-semibold text-white">
          {offer.discountLabel}
        </span>
        <h2
          className="text-sm font-semibold text-[#24140C] sm:text-base lg:text-lg"
        >
          {offer.title}
        </h2>
        <span className="text-xs text-[#7A6658] sm:text-sm">{offer.validityLabel}</span>
      </div>

      {/* Row 2: chips (mobile only) */}
      {visibleChips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#746154] lg:hidden">
          <span className="font-medium">Applies to:</span>
          {visibleChips.map((chip) => (
            <span
              key={`${offer.id}-${chip.type}-${chip.id}`}
              className="rounded-full border border-[#D8C7B8] bg-[#FCF8F4] px-2.5 py-1"
            >
              {chip.label}
            </span>
          ))}
          {hiddenChipCount > 0 && (
            <EligibleServicesDrawer
              offer={offer}
              triggerLabel={`+${hiddenChipCount} more`}
              className="rounded-full border border-[#D8C7B8] bg-transparent px-2.5 py-1 font-semibold text-[#6B4423]"
            />
          )}
        </div>
      )}

      {/* Row 3: code/auto label + View all — always stacks cleanly */}
      <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
        {offer.offerKind === "code" ? (
          <>
            <span className="rounded-full border border-[#D8C7B8] bg-[#FCF8F4] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6B4423]">
              {offer.code}
            </span>
            <CopyCodeButton
              code={offer.code ?? ""}
              label="Copy code"
              className="h-8 rounded-full bg-[#6B4423] px-3 text-xs text-white hover:bg-[#4E301D] sm:h-9 sm:px-4 sm:text-sm"
            />
          </>
        ) : offer.offerKind === "auto" ? (
          <p className="text-xs text-[#746154] sm:text-sm">Applied at checkout</p>
        ) : (
          <p className="text-xs text-[#746154] sm:text-sm">Package pricing in booking flow</p>
        )}

        <Link
          href={viewAllHref}
          className="ml-auto text-xs font-semibold text-[#6B4423] underline-offset-4 transition-colors hover:text-[#4E301D] hover:underline sm:text-sm"
        >
          View all →
        </Link>
      </div>
    </header>
  );
}
