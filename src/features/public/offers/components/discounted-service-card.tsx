"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import type {
  EligibleServiceRecord,
  OfferSectionRecord,
} from "../lib/offers-data";
import { buildOfferBookingHref, buildOfferDetailHref } from "./offer-linking";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1526758097130-bab247274f58?w=900&q=80";

export function DiscountedServiceCard({
  offer,
  service,
}: {
  offer: OfferSectionRecord;
  service: EligibleServiceRecord;
}) {
  const detailHref = buildOfferDetailHref(offer, service.slug);
  const bookingHref = buildOfferBookingHref(offer, service.slug);

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={service.image || FALLBACK_IMAGE}
          alt={service.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm">
          {service.categoryName}
        </span>
        {/* Discount badge - only difference from regular card */}
        <span className="absolute right-3 top-3 rounded-full bg-[#6B4423] px-3 py-1 text-xs font-semibold text-white shadow-sm">
          {service.discountBadge}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight text-gray-900 sm:text-base lg:text-lg">
            {service.name}
          </h3>
          <div className="shrink-0 text-right">
            {service.price.originalLabel ? (
              <span className="block text-xs text-gray-400 line-through sm:text-sm">
                {service.price.originalLabel}
              </span>
            ) : null}
            <span className="block whitespace-nowrap text-sm font-bold text-gray-900 sm:text-base">
              {service.price.discountedLabel ?? service.price.emphasisLabel}
            </span>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
          <Clock className="h-3.5 w-3.5 text-gray-400 sm:h-4 sm:w-4" />
          {service.durationMinutes} min
        </div>

        <p className="mb-4 flex-1 line-clamp-2 text-xs text-gray-500 sm:mb-5 sm:text-sm">
          {service.description ?? "Discover this signature treatment."}
        </p>

        <div className="mt-auto flex gap-2 sm:gap-3">
          <Link
            href={detailHref}
            className="flex-1 rounded-xl bg-gray-100 py-2 text-center text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-200 sm:py-2.5 sm:text-sm"
          >
            Details
          </Link>
          <Link
            href={bookingHref}
            className="flex-1 rounded-xl bg-[#6B4423] py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-[#4A2C1A] sm:py-2.5 sm:text-sm"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}
