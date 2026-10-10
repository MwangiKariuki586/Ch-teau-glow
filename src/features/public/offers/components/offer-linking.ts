import { appendPromoContext } from "@/features/public/shared/promo-context";
import type { OfferSectionRecord } from "../lib/offers-data";

export function buildOfferServicesHref(offer: OfferSectionRecord) {
  if (offer.offerKind === "package" && offer.packageSlug) {
    return appendPromoContext("/services", { packageSlug: offer.packageSlug });
  }

  return appendPromoContext("/services", {
    offerId: offer.id,
    code: offer.code,
  });
}

export function buildOfferBookingHref(
  offer: OfferSectionRecord,
  serviceSlug: string,
) {
  if (offer.offerKind === "package") {
    if (!offer.packageSlug) {
      return `/services/${serviceSlug}`;
    }

    return appendPromoContext(
      "/book",
      { packageSlug: offer.packageSlug },
      { service: serviceSlug },
    );
  }

  return appendPromoContext(
    "/book",
    {
      offerId: offer.id,
      code: offer.code,
    },
    { service: serviceSlug },
  );
}

export function buildOfferDetailHref(
  offer: OfferSectionRecord,
  serviceSlug: string,
) {
  if (offer.offerKind === "package") {
    return offer.packageSlug
      ? appendPromoContext(`/services/${serviceSlug}`, {
          packageSlug: offer.packageSlug,
        })
      : `/services/${serviceSlug}`;
  }

  return appendPromoContext(`/services/${serviceSlug}`, {
    offerId: offer.id,
    code: offer.code,
  });
}
