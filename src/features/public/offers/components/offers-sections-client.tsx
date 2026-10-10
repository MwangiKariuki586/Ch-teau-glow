"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { OfferSectionRecord } from "../lib/offers-data";
import { EligibleServicesRail } from "./eligible-services-rail";
import { OfferHeader } from "./offer-header";

type OfferFilter = "all" | "code" | "auto" | "package";
type OfferSort = "priority" | "ending" | "discount";

function getOfferSearchText(offer: OfferSectionRecord) {
  return [
    offer.title,
    offer.subtitle,
    offer.eligibility_summary,
    offer.code,
    ...offer.chips.map((chip) => chip.label),
    ...offer.railServices.map((service) => service.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getDiscountRank(offer: OfferSectionRecord) {
  return typeof offer.value_numeric === "number" ? offer.value_numeric : 0;
}

export function OffersSectionsClient({
  offers,
}: {
  offers: OfferSectionRecord[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OfferFilter>("all");
  const [sort, setSort] = useState<OfferSort>("priority");

  const filteredOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = offers.filter((offer) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "code" && offer.offerKind === "code") ||
        (filter === "auto" && offer.offerKind === "auto") ||
        (filter === "package" && offer.offerKind === "package");

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return getOfferSearchText(offer).includes(normalizedQuery);
    });

    next.sort((left, right) => {
      if (sort === "ending") {
        const leftValue = left.ends_at
          ? new Date(left.ends_at).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightValue = right.ends_at
          ? new Date(right.ends_at).getTime()
          : Number.MAX_SAFE_INTEGER;
        return leftValue - rightValue;
      }

      if (sort === "discount") {
        return getDiscountRank(right) - getDiscountRank(left);
      }

      return right.priority - left.priority;
    });

    return next;
  }, [filter, offers, query, sort]);

  return (
    <div className="space-y-6">
      {/* <section className="rounded-[32px] border border-[#E8DDD2] bg-white/90 p-5 shadow-[0_18px_40px_rgba(90,55,30,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A7566]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services on offer"
              className="h-12 rounded-full border-[#D8C7B8] bg-[#FCF9F5] pl-11 pr-4 text-sm"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["code", "Code offers"],
                ["auto", "Auto-applied"],
                ["package", "Package offers"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as OfferFilter)}
                  className={
                    filter === value
                      ? "rounded-full bg-[#6B4423] px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-full border border-[#D8C7B8] bg-[#FCF9F5] px-4 py-2 text-sm font-semibold text-[#5C4432]"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as OfferSort)}
              className="h-11 rounded-full border border-[#D8C7B8] bg-[#FCF9F5] px-4 text-sm font-medium text-[#5C4432]"
            >
              <option value="priority">Featured first</option>
              <option value="ending">Ending soon</option>
              <option value="discount">Highest discount</option>
            </select>
          </div>
        </div>
      </section> */}

      {filteredOffers.length === 0 ? (
        <div className="rounded-[30px] border border-dashed border-[#D7C6B2] bg-white px-6 py-14 text-center text-[#6B5749]">
          No offers match the current search or filters.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOffers.map((offer) => (
            <section key={offer.id}>
              <OfferHeader offer={offer} />
              <EligibleServicesRail offer={offer} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
