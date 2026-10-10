/**
 * Payment amount calculation utility.
 * Prices stored in the database are already in cents / minor units.
 * Implements pricing priority: specialist-specific > branch-specific > service base
 * and applies validated service-linked offers.
 */

import { createClient } from "@/lib/supabase/server";

export interface AppliedOfferSummary {
  id: string;
  title: string;
  code: string | null;
  offer_type: "percent_off" | "fixed_credit" | "free_gift" | "other";
  value_numeric: number | null;
}

export interface AppliedPackageSummary {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
}

export interface BookingAmountResult {
  amount_cents: number;
  currency: string;
  base_amount_minor: number;
  discount_amount_minor: number;
  final_amount_minor: number;
  applied_offer: AppliedOfferSummary | null;
  applied_package: AppliedPackageSummary | null;
  validation_status: "none" | "applied" | "invalid";
  validation_message: string | null;
}

function toMinorUnitsFromStoredCents(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

function normalizeOfferValue(value: number | string | null) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return null;
}

export async function calculateBookingAmount(params: {
  serviceId: string;
  specialistId: string;
  branchId: string;
  packageId?: string | null;
  offerId?: string | null;
  code?: string | null;
}): Promise<BookingAmountResult> {
  const supabase = await createClient();

  const [{ data: specialistService }, { data: service, error: serviceError }] =
    await Promise.all([
      supabase
        .from("specialist_services")
        .select("min_price_cents, max_price_cents")
        .eq("specialist_id", params.specialistId)
        .eq("service_id", params.serviceId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("services")
        .select("min_price_cents, max_price_cents, currency, category_id")
        .eq("id", params.serviceId)
        .single(),
    ]);

  if (serviceError || !service) {
    throw new Error("Service not found");
  }

  let selectedPriceMinor = toMinorUnitsFromStoredCents(
    specialistService?.min_price_cents ?? null,
  );

  if (selectedPriceMinor === null) {
    const { data: branchService } = await supabase
      .from("branch_services")
      .select("min_price_cents, max_price_cents")
      .eq("branch_id", params.branchId)
      .eq("service_id", params.serviceId)
      .eq("is_active", true)
      .maybeSingle();

    selectedPriceMinor = toMinorUnitsFromStoredCents(
      branchService?.min_price_cents ?? null,
    );
  }

  if (selectedPriceMinor === null) {
    selectedPriceMinor = toMinorUnitsFromStoredCents(service.min_price_cents);
  }

  if (selectedPriceMinor === null || selectedPriceMinor <= 0) {
    throw new Error("Invalid service pricing");
  }

  const trimmedPackageId = params.packageId?.trim() || null;
  const trimmedOfferId = params.offerId?.trim() || null;
  const trimmedCode = params.code?.trim() || null;

  if (trimmedPackageId) {
    const { data: packageRecord, error: packageError } = await supabase
      .from("packages")
      .select("id,name,slug,price_cents,currency,is_active")
      .eq("id", trimmedPackageId)
      .maybeSingle();

    if (packageError) {
      throw new Error("Unable to validate the selected package.");
    }

    if (!packageRecord || !packageRecord.is_active) {
      throw new Error("This package is no longer available.");
    }

    const { data: packageItem, error: packageItemError } = await supabase
      .from("package_items")
      .select("id")
      .eq("package_id", trimmedPackageId)
      .eq("service_id", params.serviceId)
      .maybeSingle();

    if (packageItemError) {
      throw new Error("Unable to confirm the selected package service.");
    }

    if (!packageItem) {
      throw new Error("The selected service is not part of this package.");
    }

    const packagePriceMinor = toMinorUnitsFromStoredCents(packageRecord.price_cents);
    if (packagePriceMinor === null || packagePriceMinor < 0) {
      throw new Error("Invalid package pricing.");
    }

    return {
      amount_cents: packagePriceMinor,
      currency: packageRecord.currency,
      base_amount_minor: packagePriceMinor,
      discount_amount_minor: 0,
      final_amount_minor: packagePriceMinor,
      applied_offer: null,
      applied_package: {
        id: packageRecord.id,
        name: packageRecord.name,
        slug: packageRecord.slug,
        price_cents: packageRecord.price_cents,
        currency: packageRecord.currency,
      },
      validation_status: "applied",
      validation_message: "Package pricing applied for this package booking.",
    };
  }

  const currency = service.currency;

  if (!trimmedOfferId && !trimmedCode) {
    return {
      amount_cents: selectedPriceMinor,
      currency,
      base_amount_minor: selectedPriceMinor,
      discount_amount_minor: 0,
      final_amount_minor: selectedPriceMinor,
      applied_offer: null,
      applied_package: null,
      validation_status: "none",
      validation_message: null,
    };
  }

  if (!trimmedOfferId) {
    throw new Error("Offer validation failed. Please reopen the offer link and try again.");
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select(
      "id,title,code,offer_type,value_numeric,is_active,starts_at,ends_at",
    )
    .eq("id", trimmedOfferId)
    .maybeSingle();

  if (offerError) {
    throw new Error("Unable to validate the selected offer.");
  }

  if (!offer) {
    throw new Error("Offer not found.");
  }

  const now = Date.now();
  const startsAt = offer.starts_at ? new Date(offer.starts_at).getTime() : null;
  const endsAt = offer.ends_at ? new Date(offer.ends_at).getTime() : null;

  if (!offer.is_active) {
    throw new Error("This offer is no longer active.");
  }

  if (startsAt !== null && startsAt > now) {
    throw new Error("This offer is not active yet.");
  }

  if (endsAt !== null && endsAt < now) {
    throw new Error("This offer has expired.");
  }

  // Check offer eligibility using offer_targets
  const { data: targets } = await supabase
    .from("offer_targets")
    .select("target_type, target_id, include")
    .eq("offer_id", trimmedOfferId)
    .eq("include", true);

  if (!targets || targets.length === 0) {
    throw new Error("This offer has no valid targets configured.");
  }

  // Get service category for category matching
  const categoryId = service.category_id || null;

  // Check if offer applies to this service
  const isEligible = targets.some((target) => {
    if (target.target_type === "all_services") {
      return true;
    }
    if (target.target_type === "service" && target.target_id === params.serviceId) {
      return true;
    }
    if (target.target_type === "category" && target.target_id === categoryId) {
      return true;
    }
    // Package targeting is handled separately in package booking flow
    return false;
  });

  if (!isEligible) {
    throw new Error("This offer is not valid for the selected service.");
  }

  if (trimmedCode && offer.code && offer.code.trim().toUpperCase() !== trimmedCode.toUpperCase()) {
    throw new Error("Promo code does not match the selected offer.");
  }

  if (trimmedCode && !offer.code) {
    throw new Error("Promo code does not match the selected offer.");
  }

  const numericValue = normalizeOfferValue(offer.value_numeric);
  let discountAmountMinor = 0;

  if (offer.offer_type === "percent_off") {
    if (numericValue === null || numericValue < 0) {
      throw new Error("Offer configuration is invalid.");
    }
    discountAmountMinor = Math.round(selectedPriceMinor * (numericValue / 100));
  } else if (offer.offer_type === "fixed_credit") {
    if (numericValue === null || numericValue < 0) {
      throw new Error("Offer configuration is invalid.");
    }
    discountAmountMinor = Math.round(numericValue * 100);
  }

  const finalAmountMinor = Math.max(0, selectedPriceMinor - discountAmountMinor);

  return {
    amount_cents: finalAmountMinor,
    currency,
    base_amount_minor: selectedPriceMinor,
    discount_amount_minor: Math.min(discountAmountMinor, selectedPriceMinor),
    final_amount_minor: finalAmountMinor,
    applied_offer: {
      id: offer.id,
      title: offer.title,
      code: offer.code,
      offer_type: offer.offer_type,
      value_numeric: numericValue,
    },
    applied_package: null,
    validation_status: "applied",
    validation_message:
      discountAmountMinor > 0
        ? "Offer applied to this service."
        : "Offer confirmed for this service.",
  };
}
