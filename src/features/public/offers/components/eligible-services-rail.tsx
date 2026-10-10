"use client";

import type { OfferSectionRecord } from "../lib/offers-data";
import { DiscountedServiceCard } from "./discounted-service-card";

export function EligibleServicesRail({ offer }: { offer: OfferSectionRecord }) {
  if (offer.railServices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D7C6B2] bg-white px-5 py-8 text-sm text-[#6B5749]">
        No eligible services are currently available for this offer.
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5">
        {offer.railServices.map((service) => (
          <DiscountedServiceCard
            key={`${offer.id}-${service.id}`}
            offer={offer}
            service={service}
          />
        ))}
      </div>
    </div>
  );
}
