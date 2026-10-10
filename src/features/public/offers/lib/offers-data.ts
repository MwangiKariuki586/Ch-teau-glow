import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type OfferType =
  | "percent_off"
  | "fixed_credit"
  | "free_gift"
  | "other";
export type OfferTargetType =
  | "service"
  | "category"
  | "package"
  | "all_services";

export interface OfferTargetRef {
  id: string;
  name: string;
  slug: string;
}

export interface OfferTargetRecord {
  offer_id: string;
  target_type: OfferTargetType;
  target_id: string | null;
  include: boolean;
}

export interface OfferTargetChip {
  id: string;
  label: string;
  slug: string | null;
  type: OfferTargetType;
}

export interface OfferRecord {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  offer_type: OfferType;
  code: string | null;
  value_numeric: number | null;
  currency: string;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  eligibility_summary: string | null;
  applies_to: "service" | "category" | "package";
  cta_label: string | null;
  priority: number;
  service: OfferTargetRef | null;
  category: OfferTargetRef | null;
  package: OfferTargetRef | null;
}

export interface PackageServiceItem {
  id: string;
  name: string;
  slug: string;
  duration_minutes: number;
  quantity: number;
  display_order: number;
}

export interface PackageRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  package_type: "curated" | "plan";
  price_cents: number;
  compare_at_cents: number | null;
  currency: string;
  save_label: string | null;
  badge: string | null;
  image_url: string | null;
  sort_order: number;
  services: PackageServiceItem[];
}

export interface EligibleServicePriceSummary {
  baseLabel: string;
  originalLabel: string | null;
  discountedLabel: string | null;
  emphasisLabel: string;
  note: string | null;
  isComputed: boolean;
}

export interface EligibleServiceRecord {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  description: string | null;
  durationMinutes: number;
  image: string | null;
  price: EligibleServicePriceSummary;
  discountBadge: string;
  microcopy: string;
  bestOfferApplied: boolean;
}

export interface OfferSectionRecord extends OfferRecord {
  targets: OfferTargetRecord[];
  chips: OfferTargetChip[];
  discountLabel: string;
  validityLabel: string;
  offerKind: "code" | "auto" | "package";
  packageSlug: string | null;
  eligibleServiceCount: number;
  railServices: EligibleServiceRecord[];
}

export interface EligibleServicesPage {
  offer: OfferSectionRecord;
  services: EligibleServiceRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
}

type OfferWithTargetsRecord = OfferRecord & {
  targets: OfferTargetRecord[];
};

type OfferRow = Omit<OfferRecord, "service" | "category" | "package"> & {
  service: OfferTargetRef | OfferTargetRef[] | null;
  category: OfferTargetRef | OfferTargetRef[] | null;
  package: OfferTargetRef | OfferTargetRef[] | null;
};

type PackageRow = Omit<PackageRecord, "services"> & {
  package_items: Array<{
    quantity: number;
    display_order: number;
    service:
      | {
          id: string;
          name: string;
          slug: string;
          duration_minutes: number;
        }
      | {
          id: string;
          name: string;
          slug: string;
          duration_minutes: number;
        }[]
      | null;
  }> | null;
};

type ServiceIndexRow = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  is_featured: boolean;
  created_at: string;
};

type ServiceDetailRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
  duration_minutes: number;
  cover_image_url: string | null;
  category_id: string;
  category:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

type BranchPriceRow = {
  service_id: string;
  min_price_cents: number | null;
  max_price_cents: number | null;
};

type PackageServiceLink = {
  package_id: string;
  service_id: string;
};

export class OffersDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OffersDataError";
  }
}

function getPublicSupabaseClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function toSingle<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function sanitizeSearchTerm(value: string) {
  return value.trim().replace(/[%_,()]/g, " ");
}

function compareServiceIndexRows(a: ServiceIndexRow, b: ServiceIndexRow) {
  if (a.is_featured !== b.is_featured) {
    return Number(b.is_featured) - Number(a.is_featured);
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function uniqueOrderedIds(ids: Iterable<string>) {
  return Array.from(new Set(Array.from(ids).filter(Boolean)));
}

function normalizeOfferValue(value: number | string | null) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return null;
}

function estimateDiscountAmountMinor(
  offer: Pick<OfferRecord, "offer_type" | "value_numeric">,
  basePriceCents: number,
) {
  const numericValue = normalizeOfferValue(offer.value_numeric);

  if (numericValue === null || numericValue <= 0 || basePriceCents <= 0) {
    return 0;
  }

  if (offer.offer_type === "percent_off") {
    return Math.round(basePriceCents * (numericValue / 100));
  }

  if (offer.offer_type === "fixed_credit") {
    return Math.round(numericValue * 100);
  }

  return 0;
}

function hasPackageTarget(offer: OfferWithTargetsRecord) {
  return offer.targets.some((target) => target.target_type === "package");
}

function getOfferKind(offer: OfferWithTargetsRecord) {
  if (hasPackageTarget(offer) || offer.package) {
    return "package" as const;
  }

  if (offer.code) {
    return "code" as const;
  }

  return "auto" as const;
}

export function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export function formatOfferDiscountLabel(
  offer: Pick<OfferRecord, "offer_type" | "value_numeric" | "currency">,
) {
  const numericValue = normalizeOfferValue(offer.value_numeric);

  if (offer.offer_type === "percent_off" && numericValue) {
    return `-${numericValue}%`;
  }

  if (offer.offer_type === "fixed_credit" && numericValue) {
    return `${offer.currency} ${numericValue} off`;
  }

  if (offer.offer_type === "free_gift") {
    return "Included extra";
  }

  return "Exclusive offer";
}

export function formatOfferValidityLabel(
  offer: Pick<OfferRecord, "ends_at">,
) {
  if (!offer.ends_at) {
    return "Ongoing";
  }

  const endsAt = new Date(offer.ends_at);
  if (Number.isNaN(endsAt.getTime())) {
    return "Ongoing";
  }

  return `Ends ${endsAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

async function getTargetMaps(params: {
  serviceIds: string[];
  categoryIds: string[];
  packageIds: string[];
}) {
  const supabase = getPublicSupabaseClient();

  const [serviceResult, categoryResult, packageResult] = await Promise.all([
    params.serviceIds.length
      ? supabase.from("services").select("id,name,slug").in("id", params.serviceIds)
      : Promise.resolve({ data: [], error: null }),
    params.categoryIds.length
      ? supabase
          .from("service_categories")
          .select("id,name,slug")
          .in("id", params.categoryIds)
      : Promise.resolve({ data: [], error: null }),
    params.packageIds.length
      ? supabase.from("packages").select("id,name,slug").in("id", params.packageIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (serviceResult.error || categoryResult.error || packageResult.error) {
    console.error("Target maps query error:", { serviceResult, categoryResult, packageResult });
    throw new OffersDataError("We're having trouble loading offer information. Please try again.");
  }

  return {
    services: new Map(
      ((serviceResult.data ?? []) as OfferTargetRef[]).map((item) => [item.id, item]),
    ),
    categories: new Map(
      ((categoryResult.data ?? []) as OfferTargetRef[]).map((item) => [item.id, item]),
    ),
    packages: new Map(
      ((packageResult.data ?? []) as OfferTargetRef[]).map((item) => [item.id, item]),
    ),
  };
}

async function getOfferTargetsByOfferId(offerIds: string[]) {
  const supabase = getPublicSupabaseClient();

  if (offerIds.length === 0) {
    return new Map<string, OfferTargetRecord[]>();
  }

  const { data, error } = await supabase
    .from("offer_targets")
    .select("offer_id,target_type,target_id,include")
    .in("offer_id", offerIds)
    .eq("include", true);

  if (error) {
    console.error("Supabase offer targets query error:", error);
    throw new OffersDataError(
      "We're having trouble loading offer details. Please try again in a moment.",
    );
  }

  const map = new Map<string, OfferTargetRecord[]>();

  for (const target of (data ?? []) as OfferTargetRecord[]) {
    const current = map.get(target.offer_id) ?? [];
    current.push(target);
    map.set(target.offer_id, current);
  }

  return map;
}

async function getActiveOffersWithTargets(): Promise<OfferWithTargetsRecord[]> {
  try {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase
      .from("offers")
      .select(
        "id,title,subtitle,badge,offer_type,code,value_numeric,currency,image_url,starts_at,ends_at,eligibility_summary,applies_to,cta_label,priority,service:services(id,name,slug),category:service_categories(id,name,slug),package:packages(id,name,slug)",
      )
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase offers query error:", error);
      throw new OffersDataError(
        "We're having trouble loading offers right now. Please try again in a moment.",
      );
    }

    const now = Date.now();
    const offers = ((data ?? []) as OfferRow[])
      .filter((offer) => {
        const startsOk =
          !offer.starts_at || new Date(offer.starts_at).getTime() <= now;
        const endsOk =
          !offer.ends_at || new Date(offer.ends_at).getTime() >= now;

        return startsOk && endsOk;
      })
      .map((offer) => ({
        ...offer,
        value_numeric:
          typeof offer.value_numeric === "number"
            ? offer.value_numeric
            : offer.value_numeric === null
              ? null
              : Number(offer.value_numeric),
        service: toSingle(offer.service),
        category: toSingle(offer.category),
        package: toSingle(offer.package),
      }));

    const targetsByOfferId = await getOfferTargetsByOfferId(
      offers.map((offer) => offer.id),
    );

    return offers.map((offer) => {
      const fallbackTargets: OfferTargetRecord[] = [];

      if (offer.service) {
        fallbackTargets.push({
          offer_id: offer.id,
          target_type: "service",
          target_id: offer.service.id,
          include: true,
        });
      }

      if (offer.category) {
        fallbackTargets.push({
          offer_id: offer.id,
          target_type: "category",
          target_id: offer.category.id,
          include: true,
        });
      }

      if (offer.package) {
        fallbackTargets.push({
          offer_id: offer.id,
          target_type: "package",
          target_id: offer.package.id,
          include: true,
        });
      }

      return {
        ...offer,
        targets: targetsByOfferId.get(offer.id) ?? fallbackTargets,
      };
    });
  } catch (error) {
    console.error("Error loading offers with targets:", error);
    if (error instanceof OffersDataError) {
      throw error;
    }
    throw new OffersDataError(
      "We're having trouble connecting to our services. Please check your internet connection and try again.",
    );
  }
}

async function getPackageServicesMap(packageIds: string[]) {
  const supabase = getPublicSupabaseClient();

  if (packageIds.length === 0) {
    return new Map<string, string[]>();
  }

  const { data, error } = await supabase
    .from("package_items")
    .select("package_id,service_id")
    .in("package_id", packageIds);

  if (error) {
    console.error("Package items query error:", error);
    throw new OffersDataError(
      "We're having trouble loading package details. Please try again.",
    );
  }

  const map = new Map<string, string[]>();

  for (const row of (data ?? []) as PackageServiceLink[]) {
    const current = map.get(row.package_id) ?? [];
    current.push(row.service_id);
    map.set(row.package_id, current);
  }

  return map;
}

async function getServiceIndexByIds(ids: string[]) {
  const supabase = getPublicSupabaseClient();

  if (ids.length === 0) {
    return new Map<string, ServiceIndexRow>();
  }

  const { data, error } = await supabase
    .from("services")
    .select("id,name,slug,category_id,is_featured,created_at")
    .eq("status", "published")
    .in("id", ids);

  if (error) {
    console.error("Services index query error:", error);
    throw new OffersDataError(
      "We're having trouble loading services. Please try again.",
    );
  }

  return new Map(
    ((data ?? []) as ServiceIndexRow[]).map((service) => [service.id, service]),
  );
}

async function getOrderedServiceIndexForCategories(categoryIds: string[]) {
  const supabase = getPublicSupabaseClient();
  const orderedIdsByCategory = new Map<string, string[]>();
  const serviceIndex = new Map<string, ServiceIndexRow>();

  if (categoryIds.length === 0) {
    return { orderedIdsByCategory, serviceIndex };
  }

  const { data, error } = await supabase
    .from("services")
    .select("id,name,slug,category_id,is_featured,created_at")
    .eq("status", "published")
    .in("category_id", categoryIds)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Category services query error:", error);
    throw new OffersDataError(
      "We're having trouble loading category services. Please try again.",
    );
  }

  for (const service of (data ?? []) as ServiceIndexRow[]) {
    serviceIndex.set(service.id, service);

    const current = orderedIdsByCategory.get(service.category_id) ?? [];
    current.push(service.id);
    orderedIdsByCategory.set(service.category_id, current);
  }

  return { orderedIdsByCategory, serviceIndex };
}

async function getAllOrderedPublishedServices() {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .select("id,name,slug,category_id,is_featured,created_at")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("All published services query error:", error);
    throw new OffersDataError(
      "We're having trouble loading our service catalog. Please try again.",
    );
  }

  const services = (data ?? []) as ServiceIndexRow[];

  return {
    orderedIds: services.map((service) => service.id),
    serviceIndex: new Map(services.map((service) => [service.id, service])),
  };
}

async function getServiceDetailsByIds(serviceIds: string[]) {
  const supabase = getPublicSupabaseClient();

  if (serviceIds.length === 0) {
    return new Map<string, ServiceDetailRow>();
  }

  const { data, error } = await supabase
    .from("services")
    .select(
      "id,name,slug,description,min_price_cents,max_price_cents,currency,duration_minutes,cover_image_url,category_id,category:service_categories(id,name,slug)",
    )
    .eq("status", "published")
    .in("id", serviceIds);

  if (error) {
    console.error("Service details query error:", error);
    throw new OffersDataError(
      "We're having trouble loading service information. Please try again.",
    );
  }

  return new Map(
    ((data ?? []) as ServiceDetailRow[]).map((service) => [service.id, service]),
  );
}

async function getBranchPriceRowsByServiceIds(serviceIds: string[]) {
  const supabase = getPublicSupabaseClient();

  if (serviceIds.length === 0) {
    return new Map<string, BranchPriceRow[]>();
  }

  const { data, error } = await supabase
    .from("branch_services")
    .select("service_id,min_price_cents,max_price_cents")
    .eq("is_active", true)
    .in("service_id", serviceIds);

  if (error) {
    console.error("Branch pricing query error:", error);
    throw new OffersDataError(
      "We're having trouble loading pricing information. Please try again.",
    );
  }

  const map = new Map<string, BranchPriceRow[]>();

  for (const row of (data ?? []) as BranchPriceRow[]) {
    const current = map.get(row.service_id) ?? [];
    current.push(row);
    map.set(row.service_id, current);
  }

  return map;
}

function buildOfferChips(
  offer: OfferWithTargetsRecord,
  targetMaps: Awaited<ReturnType<typeof getTargetMaps>>,
) {
  const chips: OfferTargetChip[] = [];

  if (offer.targets.length === 0) {
    if (offer.service) {
      chips.push({
        id: offer.service.id,
        label: offer.service.name,
        slug: offer.service.slug,
        type: "service",
      });
    }

    if (offer.category) {
      chips.push({
        id: offer.category.id,
        label: offer.category.name,
        slug: offer.category.slug,
        type: "category",
      });
    }

    if (offer.package) {
      chips.push({
        id: offer.package.id,
        label: offer.package.name,
        slug: offer.package.slug,
        type: "package",
      });
    }

    return chips;
  }

  for (const target of offer.targets) {
    if (target.target_type === "all_services") {
      chips.push({
        id: `${offer.id}-all-services`,
        label: "All services",
        slug: null,
        type: "all_services",
      });
      continue;
    }

    if (!target.target_id) {
      continue;
    }

    if (target.target_type === "service") {
      const ref = targetMaps.services.get(target.target_id);
      if (ref) {
        chips.push({
          id: ref.id,
          label: ref.name,
          slug: ref.slug,
          type: "service",
        });
      }
      continue;
    }

    if (target.target_type === "category") {
      const ref = targetMaps.categories.get(target.target_id);
      if (ref) {
        chips.push({
          id: ref.id,
          label: ref.name,
          slug: ref.slug,
          type: "category",
        });
      }
      continue;
    }

    const ref = targetMaps.packages.get(target.target_id);
    if (ref) {
      chips.push({
        id: ref.id,
        label: ref.name,
        slug: ref.slug,
        type: "package",
      });
    }
  }

  return chips;
}

function resolveOfferPackageSlug(
  offer: OfferWithTargetsRecord,
  targetMaps: Awaited<ReturnType<typeof getTargetMaps>>,
) {
  if (offer.package?.slug) {
    return offer.package.slug;
  }

  const packageTargets = offer.targets.filter(
    (target) => target.target_type === "package" && target.target_id,
  );

  if (packageTargets.length !== 1) {
    return null;
  }

  return targetMaps.packages.get(packageTargets[0].target_id!)?.slug ?? null;
}

function resolveMicrocopy(offer: OfferWithTargetsRecord) {
  const kind = getOfferKind(offer);

  if (kind === "package") {
    return "Package pricing is confirmed in the booking flow";
  }

  if (offer.code) {
    return `Use code ${offer.code}`;
  }

  return "Discount applied at checkout";
}

function buildEligiblePriceSummary(params: {
  service: ServiceDetailRow;
  offer: OfferWithTargetsRecord;
  branchRows: BranchPriceRow[];
  bestOfferId: string | null;
}) {
  const { service, offer, branchRows, bestOfferId } = params;
  const baseMin = service.min_price_cents;
  const baseMax = service.max_price_cents;
  const baseLabel =
    baseMin === baseMax
      ? formatMoney(baseMin, service.currency)
      : `From ${formatMoney(baseMin, service.currency)}`;

  const hasBranchVariance = branchRows.some((row) => {
    const min = row.min_price_cents ?? service.min_price_cents;
    const max = row.max_price_cents ?? service.max_price_cents;
    return min !== service.min_price_cents || max !== service.max_price_cents;
  });

  if (bestOfferId !== offer.id) {
    return {
      baseLabel,
      originalLabel: null,
      discountedLabel: null,
      emphasisLabel: baseLabel,
      note: "Best eligible offer is applied at checkout.",
      isComputed: false,
    } satisfies EligibleServicePriceSummary;
  }

  const discountMin = estimateDiscountAmountMinor(offer, baseMin);
  if (
    discountMin > 0 &&
    (offer.offer_type === "percent_off" || offer.offer_type === "fixed_credit") &&
    !hasBranchVariance
  ) {
    const discounted = Math.max(0, baseMin - discountMin);
    const discountedLabel =
      baseMin === baseMax
        ? formatMoney(discounted, service.currency)
        : `From ${formatMoney(discounted, service.currency)}`;

    return {
      baseLabel,
      originalLabel: baseLabel,
      discountedLabel,
      emphasisLabel: discountedLabel,
      note:
        baseMin === baseMax
          ? null
          : "Final price depends on the selected service variation.",
      isComputed: true,
    } satisfies EligibleServicePriceSummary;
  }

  if (offer.offer_type === "percent_off" && offer.value_numeric) {
    return {
      baseLabel,
      originalLabel: null,
      discountedLabel: null,
      emphasisLabel: `Up to ${offer.value_numeric}% off`,
      note: "Final price shown at checkout.",
      isComputed: false,
    } satisfies EligibleServicePriceSummary;
  }

  if (offer.offer_type === "fixed_credit" && offer.value_numeric) {
    return {
      baseLabel,
      originalLabel: null,
      discountedLabel: null,
      emphasisLabel: `${offer.currency} ${offer.value_numeric} off`,
      note: "Final price shown at checkout.",
      isComputed: false,
    } satisfies EligibleServicePriceSummary;
  }

  return {
    baseLabel,
    originalLabel: null,
    discountedLabel: null,
    emphasisLabel: baseLabel,
    note: "Best eligible offer is applied at checkout.",
    isComputed: false,
  } satisfies EligibleServicePriceSummary;
}

function buildEligibleServiceRecord(params: {
  service: ServiceDetailRow;
  offer: OfferWithTargetsRecord;
  branchRows: BranchPriceRow[];
  bestOfferId: string | null;
}) {
  const { service, offer, branchRows, bestOfferId } = params;

  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    categoryName: toSingle(service.category)?.name ?? "Uncategorized",
    description: service.description,
    durationMinutes: service.duration_minutes,
    image: service.cover_image_url,
    price: buildEligiblePriceSummary({
      service,
      offer,
      branchRows,
      bestOfferId,
    }),
    discountBadge: formatOfferDiscountLabel(offer),
    microcopy: resolveMicrocopy(offer),
    bestOfferApplied: bestOfferId === offer.id,
  } satisfies EligibleServiceRecord;
}

function isServiceEligibleForOffer(params: {
  service: Pick<ServiceDetailRow, "id" | "category_id">;
  offer: OfferWithTargetsRecord;
  packageServicesMap: Map<string, string[]>;
}) {
  const { service, offer, packageServicesMap } = params;

  return offer.targets.some((target) => {
    if (target.target_type === "all_services") {
      return true;
    }

    if (target.target_type === "service") {
      return target.target_id === service.id;
    }

    if (target.target_type === "category") {
      return target.target_id === service.category_id;
    }

    if (!target.target_id) {
      return false;
    }

    return (packageServicesMap.get(target.target_id) ?? []).includes(service.id);
  });
}

function getBestOfferIdByServiceId(params: {
  services: ServiceDetailRow[];
  offers: OfferWithTargetsRecord[];
  packageServicesMap: Map<string, string[]>;
}) {
  const result = new Map<string, string | null>();

  for (const service of params.services) {
    let bestOfferId: string | null = null;
    let bestDiscount = 0;

    for (const offer of params.offers) {
      if (
        !isServiceEligibleForOffer({
          service,
          offer,
          packageServicesMap: params.packageServicesMap,
        })
      ) {
        continue;
      }

      const estimated = estimateDiscountAmountMinor(offer, service.min_price_cents);
      if (estimated > bestDiscount) {
        bestDiscount = estimated;
        bestOfferId = offer.id;
      }
    }

    result.set(service.id, bestOfferId);
  }

  return result;
}

function toOfferSectionRecord(params: {
  offer: OfferWithTargetsRecord;
  chips: OfferTargetChip[];
  packageSlug: string | null;
  railServices: EligibleServiceRecord[];
  eligibleServiceCount: number;
}) {
  const { offer, chips, packageSlug, railServices, eligibleServiceCount } =
    params;

  return {
    ...offer,
    chips,
    discountLabel: formatOfferDiscountLabel(offer),
    validityLabel: formatOfferValidityLabel(offer),
    offerKind: getOfferKind(offer),
    packageSlug,
    eligibleServiceCount,
    railServices,
  } satisfies OfferSectionRecord;
}

function buildPagedServicesQuery(params: {
  eligibleIds: string[] | null;
  q?: string;
  page: number;
  pageSize: number;
}) {
  const supabase = getPublicSupabaseClient();
  let query = supabase
    .from("services")
    .select(
      "id,name,slug,description,min_price_cents,max_price_cents,currency,duration_minutes,cover_image_url,category_id,category:service_categories(id,name,slug)",
      { count: "exact" },
    )
    .eq("status", "published");

  if (params.eligibleIds) {
    if (params.eligibleIds.length === 0) {
      return null;
    }
    query = query.in("id", params.eligibleIds);
  }

  if (params.q?.trim()) {
    const term = sanitizeSearchTerm(params.q);
    if (term) {
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  return query
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
}

async function getEligibleServiceIdsForOffer(
  offer: OfferWithTargetsRecord,
  packageServicesMap: Map<string, string[]>,
) {
  const includesAllServices = offer.targets.some(
    (target) => target.target_type === "all_services",
  );

  if (includesAllServices) {
    return null;
  }

  const directServiceIds = offer.targets
    .filter((target) => target.target_type === "service" && target.target_id)
    .map((target) => target.target_id!);
  const categoryIds = offer.targets
    .filter((target) => target.target_type === "category" && target.target_id)
    .map((target) => target.target_id!);
  const packageIds = offer.targets
    .filter((target) => target.target_type === "package" && target.target_id)
    .map((target) => target.target_id!);

  const directServices = await getServiceIndexByIds(directServiceIds);
  const { orderedIdsByCategory, serviceIndex: categoryIndex } =
    await getOrderedServiceIndexForCategories(categoryIds);

  for (const [id, value] of categoryIndex.entries()) {
    directServices.set(id, value);
  }

  const packageServiceIds = uniqueOrderedIds(
    packageIds.flatMap((packageId) => packageServicesMap.get(packageId) ?? []),
  );
  const packageServices = await getServiceIndexByIds(packageServiceIds);

  for (const [id, value] of packageServices.entries()) {
    directServices.set(id, value);
  }

  return uniqueOrderedIds([
    ...directServices.keys(),
    ...categoryIds.flatMap((categoryId) => orderedIdsByCategory.get(categoryId) ?? []),
    ...packageServices.keys(),
  ]).sort((leftId, rightId) =>
    compareServiceIndexRows(directServices.get(leftId)!, directServices.get(rightId)!),
  );
}

export async function getActiveOffers(): Promise<OfferRecord[]> {
  const offers = await getActiveOffersWithTargets();
  return offers.map(({ targets: _targets, ...offer }) => offer);
}

export async function getActiveOfferSections(params?: {
  railLimit?: number;
}): Promise<OfferSectionRecord[]> {
  const railLimit = Math.max(1, Math.min(params?.railLimit ?? 10, 12));
  const offers = await getActiveOffersWithTargets();

  if (offers.length === 0) {
    return [];
  }

  const serviceIds = uniqueOrderedIds([
    ...offers.flatMap((offer) =>
      offer.targets
        .filter((target) => target.target_type === "service" && target.target_id)
        .map((target) => target.target_id!),
    ),
    ...offers.flatMap((offer) => (offer.service ? [offer.service.id] : [])),
  ]);
  const categoryIds = uniqueOrderedIds([
    ...offers.flatMap((offer) =>
      offer.targets
        .filter((target) => target.target_type === "category" && target.target_id)
        .map((target) => target.target_id!),
    ),
    ...offers.flatMap((offer) => (offer.category ? [offer.category.id] : [])),
  ]);
  const packageIds = uniqueOrderedIds([
    ...offers.flatMap((offer) =>
      offer.targets
        .filter((target) => target.target_type === "package" && target.target_id)
        .map((target) => target.target_id!),
    ),
    ...offers.flatMap((offer) => (offer.package ? [offer.package.id] : [])),
  ]);

  const targetMaps = await getTargetMaps({
    serviceIds,
    categoryIds,
    packageIds,
  });
  const packageServicesMap = await getPackageServicesMap(packageIds);
  const includesAllServices = offers.some((offer) =>
    offer.targets.some((target) => target.target_type === "all_services"),
  );

  const [directServiceIndex, categoryServices, allServices] = await Promise.all([
    getServiceIndexByIds(serviceIds),
    getOrderedServiceIndexForCategories(categoryIds),
    includesAllServices
      ? getAllOrderedPublishedServices()
      : Promise.resolve({
          orderedIds: [] as string[],
          serviceIndex: new Map<string, ServiceIndexRow>(),
        }),
  ]);

  const aggregateIndex = new Map<string, ServiceIndexRow>();
  for (const [id, value] of directServiceIndex.entries()) {
    aggregateIndex.set(id, value);
  }
  for (const [id, value] of categoryServices.serviceIndex.entries()) {
    aggregateIndex.set(id, value);
  }
  for (const [id, value] of allServices.serviceIndex.entries()) {
    aggregateIndex.set(id, value);
  }

  const orderedIdsByOfferId = new Map<string, string[]>();
  const previewIds = new Set<string>();

  for (const offer of offers) {
    const eligibleIds = offer.targets.some(
      (target) => target.target_type === "all_services",
    )
      ? allServices.orderedIds
      : uniqueOrderedIds(
          offer.targets.flatMap((target) => {
            if (target.target_type === "service" && target.target_id) {
              return aggregateIndex.has(target.target_id) ? [target.target_id] : [];
            }

            if (target.target_type === "category" && target.target_id) {
              return categoryServices.orderedIdsByCategory.get(target.target_id) ?? [];
            }

            if (target.target_type === "package" && target.target_id) {
              return (packageServicesMap.get(target.target_id) ?? []).filter((id) =>
                aggregateIndex.has(id),
              );
            }

            return [];
          }),
        ).sort((leftId, rightId) =>
          compareServiceIndexRows(
            aggregateIndex.get(leftId)!,
            aggregateIndex.get(rightId)!,
          ),
        );

    orderedIdsByOfferId.set(offer.id, eligibleIds);

    for (const id of eligibleIds.slice(0, railLimit)) {
      previewIds.add(id);
    }
  }

  const previewServices = await getServiceDetailsByIds(Array.from(previewIds));
  const previewBranchRows = await getBranchPriceRowsByServiceIds(
    Array.from(previewIds),
  );
  const bestOfferIds = getBestOfferIdByServiceId({
    services: Array.from(previewServices.values()),
    offers,
    packageServicesMap,
  });

  return offers.map((offer) => {
    const chips = buildOfferChips(offer, targetMaps);
    const packageSlug = resolveOfferPackageSlug(offer, targetMaps);
    const eligibleIds = orderedIdsByOfferId.get(offer.id) ?? [];
    const railServices = eligibleIds
      .slice(0, railLimit)
      .map((id) => previewServices.get(id))
      .filter((service): service is ServiceDetailRow => Boolean(service))
      .map((service) =>
        buildEligibleServiceRecord({
          service,
          offer,
          branchRows: previewBranchRows.get(service.id) ?? [],
          bestOfferId: bestOfferIds.get(service.id) ?? null,
        }),
      );

    return toOfferSectionRecord({
      offer,
      chips,
      packageSlug,
      railServices,
      eligibleServiceCount: eligibleIds.length,
    });
  });
}

export async function getEligibleServicesForOffer(params: {
  offerId: string;
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<EligibleServicesPage> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 12, 24));
  const offers = await getActiveOffersWithTargets();
  const offer = offers.find((item) => item.id === params.offerId);

  if (!offer) {
    throw new OffersDataError("This offer is no longer available or has expired.");
  }

  const serviceIds = uniqueOrderedIds([
    ...offer.targets
      .filter((target) => target.target_type === "service" && target.target_id)
      .map((target) => target.target_id!),
    ...(offer.service ? [offer.service.id] : []),
  ]);
  const categoryIds = uniqueOrderedIds([
    ...offer.targets
      .filter((target) => target.target_type === "category" && target.target_id)
      .map((target) => target.target_id!),
    ...(offer.category ? [offer.category.id] : []),
  ]);
  const packageIds = uniqueOrderedIds([
    ...offer.targets
      .filter((target) => target.target_type === "package" && target.target_id)
      .map((target) => target.target_id!),
    ...(offer.package ? [offer.package.id] : []),
  ]);

  const targetMaps = await getTargetMaps({
    serviceIds,
    categoryIds,
    packageIds,
  });
  const packageServicesMap = await getPackageServicesMap(packageIds);
  const eligibleIds = await getEligibleServiceIdsForOffer(offer, packageServicesMap);
  const pagedQuery = buildPagedServicesQuery({
    eligibleIds,
    q: params.q,
    page,
    pageSize,
  });

  if (!pagedQuery) {
    return {
      offer: toOfferSectionRecord({
        offer,
        chips: buildOfferChips(offer, targetMaps),
        packageSlug: resolveOfferPackageSlug(offer, targetMaps),
        railServices: [],
        eligibleServiceCount: 0,
      }),
      services: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      query: params.q?.trim() ?? "",
    };
  }

  const { data, error, count } = await pagedQuery;

  if (error) {
    console.error("Eligible services query error:", error);
    throw new OffersDataError(
      "We're having trouble loading eligible services. Please try again.",
    );
  }

  const services = (data ?? []) as ServiceDetailRow[];
  const branchRows = await getBranchPriceRowsByServiceIds(
    services.map((service) => service.id),
  );
  const bestOfferIds = getBestOfferIdByServiceId({
    services,
    offers,
    packageServicesMap,
  });

  return {
    offer: toOfferSectionRecord({
      offer,
      chips: buildOfferChips(offer, targetMaps),
      packageSlug: resolveOfferPackageSlug(offer, targetMaps),
      railServices: [],
      eligibleServiceCount: typeof count === "number" ? count : eligibleIds?.length ?? 0,
    }),
    services: services.map((service) =>
      buildEligibleServiceRecord({
        service,
        offer,
        branchRows: branchRows.get(service.id) ?? [],
        bestOfferId: bestOfferIds.get(service.id) ?? null,
      }),
    ),
    total: typeof count === "number" ? count : eligibleIds?.length ?? 0,
    page,
    pageSize,
    totalPages: count && count > 0 ? Math.ceil(count / pageSize) : 0,
    query: params.q?.trim() ?? "",
  };
}

export async function getActivePackages(): Promise<{
  curated: PackageRecord[];
  plan: PackageRecord[];
}> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("packages")
    .select(
      "id,name,slug,description,package_type,price_cents,compare_at_cents,currency,save_label,badge,image_url,sort_order,package_items(quantity,display_order,service:services(id,name,slug,duration_minutes))",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Packages query error:", error);
    throw new OffersDataError(
      "We're having trouble loading packages. Please try again.",
    );
  }

  const packages = ((data ?? []) as PackageRow[]).map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    slug: pkg.slug,
    description: pkg.description,
    package_type: pkg.package_type,
    price_cents: pkg.price_cents,
    compare_at_cents: pkg.compare_at_cents,
    currency: pkg.currency,
    save_label: pkg.save_label,
    badge: pkg.badge,
    image_url: pkg.image_url,
    sort_order: pkg.sort_order,
    services: (pkg.package_items ?? [])
      .map((item) => {
        const service = toSingle(item.service);
        if (!service) return null;
        return {
          id: service.id,
          name: service.name,
          slug: service.slug,
          duration_minutes: service.duration_minutes,
          quantity: item.quantity,
          display_order: item.display_order,
        };
      })
      .filter((item): item is PackageServiceItem => Boolean(item))
      .sort((a, b) => a.display_order - b.display_order),
  }));

  return {
    curated: packages.filter((pkg) => pkg.package_type === "curated"),
    plan: packages.filter((pkg) => pkg.package_type === "plan"),
  };
}

export async function getActivePackageBySlug(
  slug: string,
): Promise<PackageRecord | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("packages")
    .select(
      "id,name,slug,description,package_type,price_cents,compare_at_cents,currency,save_label,badge,image_url,sort_order,package_items(quantity,display_order,service:services(id,name,slug,duration_minutes))",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Package by slug query error:", error);
    throw new OffersDataError(
      "We're having trouble loading this package. Please try again.",
    );
  }

  if (!data) {
    return null;
  }

  const pkg = data as PackageRow;

  return {
    id: pkg.id,
    name: pkg.name,
    slug: pkg.slug,
    description: pkg.description,
    package_type: pkg.package_type,
    price_cents: pkg.price_cents,
    compare_at_cents: pkg.compare_at_cents,
    currency: pkg.currency,
    save_label: pkg.save_label,
    badge: pkg.badge,
    image_url: pkg.image_url,
    sort_order: pkg.sort_order,
    services: (pkg.package_items ?? [])
      .map((item) => {
        const service = toSingle(item.service);
        if (!service) return null;
        return {
          id: service.id,
          name: service.name,
          slug: service.slug,
          duration_minutes: service.duration_minutes,
          quantity: item.quantity,
          display_order: item.display_order,
        };
      })
      .filter((item): item is PackageServiceItem => Boolean(item))
      .sort((a, b) => a.display_order - b.display_order),
  };
}
