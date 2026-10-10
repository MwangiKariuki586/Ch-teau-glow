import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const DEFAULT_PAGE_SIZE = 12;

export interface ServiceCategorySummary {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface ServiceSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
  duration_minutes: number;
  cover_image_url: string | null;
  is_featured: boolean;
  status: string;
  created_at: string;
  rating_average: number | null;
  rating_count: number;
  category: ServiceCategorySummary | null;
}

export interface ServiceDetailItem {
  id: string;
  detail_key: string;
  display_label: string;
  detail_value: string;
  display_order: number;
}

export interface ServiceDetailsRecord extends ServiceSummary {
  category_id: string;
  details: {
    what_is_it: string | null;
    who_is_it_for: string | null;
    who_is_it_not_for: string | null;
    meta: Record<string, unknown> | null;
  } | null;
  detail_items: ServiceDetailItem[];
}

export interface ServiceReviewSummary {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface BranchSummary {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  image_url: string | null;
}

export interface ServiceFilterBranchOption {
  id: string;
  name: string;
  city: string;
  country: string;
}

export interface SpecialistSummary {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  image_url: string | null;
  availability: unknown;
  branch_id: string | null;
}

export interface PagedServiceResult {
  services: ServiceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

type RawServiceRow = Omit<ServiceSummary, "category"> & {
  rating_average?: number | null;
  rating_count?: number;
  category: ServiceCategorySummary | ServiceCategorySummary[] | null;
};

type ServiceRatingStat = {
  average: number | null;
  count: number;
};

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

async function getServiceRatingStatsByIds(
  supabase: ReturnType<typeof getPublicSupabaseClient>,
  serviceIds: string[],
): Promise<Map<string, ServiceRatingStat>> {
  const uniqueServiceIds = Array.from(new Set(serviceIds.filter(Boolean)));
  const stats = new Map<string, ServiceRatingStat>();

  for (const serviceId of uniqueServiceIds) {
    stats.set(serviceId, { average: null, count: 0 });
  }

  if (uniqueServiceIds.length === 0) {
    return stats;
  }

  const { data } = await supabase
    .from("booking_reviews")
    .select("service_id,rating")
    .in("service_id", uniqueServiceIds)
    .eq("status", "published");

  const sums = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const row of
    ((data ?? []) as Array<{ service_id: string; rating: number }>)) {
    sums.set(row.service_id, (sums.get(row.service_id) ?? 0) + row.rating);
    counts.set(row.service_id, (counts.get(row.service_id) ?? 0) + 1);
  }

  for (const serviceId of uniqueServiceIds) {
    const count = counts.get(serviceId) ?? 0;
    const sum = sums.get(serviceId) ?? 0;
    stats.set(serviceId, {
      average: count > 0 ? sum / count : null,
      count,
    });
  }

  return stats;
}

export function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

export async function getActiveServiceCategories(): Promise<
  ServiceCategorySummary[]
> {
  const supabase = getPublicSupabaseClient();
  const { data } = await supabase
    .from("service_categories")
    .select("id,name,slug,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (data ?? []) as ServiceCategorySummary[];
}

export async function getPublishedServices(params: {
  q?: string;
  category?: string;
  branch?: string;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  featured?: boolean;
  discomfortLevel?: string;
  withSideEffects?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PagedServiceResult> {
  const supabase = getPublicSupabaseClient();
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1);
  const category = params.category?.trim();
  const branch = params.branch?.trim();
  const discomfortLevel = params.discomfortLevel?.trim().toLowerCase();
  const q = params.q?.trim();
  const minPriceCents =
    typeof params.minPrice === "number" && params.minPrice >= 0
      ? Math.round(params.minPrice * 100)
      : null;
  const maxPriceCents =
    typeof params.maxPrice === "number" && params.maxPrice >= 0
      ? Math.round(params.maxPrice * 100)
      : null;
  const minDuration =
    typeof params.minDuration === "number" && params.minDuration >= 0
      ? Math.round(params.minDuration)
      : null;
  const maxDuration =
    typeof params.maxDuration === "number" && params.maxDuration >= 0
      ? Math.round(params.maxDuration)
      : null;

  const detailItemFilters: Array<{
    enabled: boolean;
    loadServiceIds: () => Promise<string[]>;
  }> = [
    {
      enabled: Boolean(discomfortLevel && discomfortLevel !== "all"),
      loadServiceIds: async () => {
        const { data } = await supabase
          .from("service_detail_items")
          .select("service_id")
          .eq("detail_key", "discomfort_level")
          .ilike("detail_value", `%${discomfortLevel}%`)
          .not("detail_value", "is", null)
          .neq("detail_value", "");

        return (data ?? []).map((row) => row.service_id);
      },
    },
    {
      enabled: Boolean(params.withSideEffects),
      loadServiceIds: async () => {
        const { data } = await supabase
          .from("service_detail_items")
          .select("service_id")
          .in("detail_key", ["side_effects", "side_effect"])
          .not("detail_value", "is", null)
          .neq("detail_value", "");

        return (data ?? []).map((row) => row.service_id);
      },
    },
    {
      enabled: Boolean(branch && branch !== "all"),
      loadServiceIds: async () => {
        const { data } = await supabase
          .from("service_branches")
          .select("service_id")
          .eq("branch_id", branch!)
          .eq("is_active", true);

        return (data ?? []).map((row) => row.service_id);
      },
    },
  ];

  let candidateServiceIds: Set<string> | null = null;

  const mergeCandidateIds = (ids: string[]) => {
    const idSet = new Set(ids);
    if (candidateServiceIds === null) {
      candidateServiceIds = idSet;
      return;
    }
    candidateServiceIds = new Set(
      Array.from(candidateServiceIds).filter((id) => idSet.has(id)),
    );
  };

  for (const filter of detailItemFilters) {
    if (!filter.enabled) continue;
    mergeCandidateIds(await filter.loadServiceIds());
  }

  const filteredServiceIds =
    candidateServiceIds === null ? null : Array.from(candidateServiceIds);

  if (filteredServiceIds !== null && filteredServiceIds.length === 0) {
    return { services: [], total: 0, page, pageSize };
  }

  let categoryId: string | null = null;
  if (category && category.toLowerCase() !== "all") {
    const { data: categoryRow } = await supabase
      .from("service_categories")
      .select("id")
      .eq("is_active", true)
      .or(`slug.eq.${category},name.ilike.${category}`)
      .maybeSingle();

    if (!categoryRow?.id) {
      return { services: [], total: 0, page, pageSize };
    }
    categoryId = categoryRow.id as string;
  }

  let query = supabase
    .from("services")
    .select(
      "id,name,slug,description,min_price_cents,max_price_cents,currency,duration_minutes,cover_image_url,is_featured,status,created_at,category:service_categories(id,name,slug,sort_order)",
      { count: "exact" },
    )
    .eq("status", "published");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (q) {
    const term = sanitizeSearchTerm(q);
    if (term) {
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  if (minPriceCents !== null) {
    query = query.gte("min_price_cents", minPriceCents);
  }

  if (maxPriceCents !== null) {
    query = query.lte("max_price_cents", maxPriceCents);
  }

  if (minDuration !== null) {
    query = query.gte("duration_minutes", minDuration);
  }

  if (maxDuration !== null) {
    query = query.lte("duration_minutes", maxDuration);
  }

  if (params.featured) {
    query = query.eq("is_featured", true);
  }

  if (filteredServiceIds !== null) {
    query = query.in("id", filteredServiceIds);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, count } = await query.range(from, to);

  const baseServices = ((data ?? []) as unknown as RawServiceRow[]).map((service) => ({
      ...service,
      rating_average: null,
      rating_count: 0,
      category: toSingle(service.category),
    }));

  const ratingStats = await getServiceRatingStatsByIds(
    supabase,
    baseServices.map((service) => service.id),
  );

  const services = baseServices.map((service) => {
    const ratingStat = ratingStats.get(service.id);
    return {
      ...service,
      rating_average: ratingStat?.average ?? null,
      rating_count: ratingStat?.count ?? 0,
    };
  });

  return {
    services,
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getPublishedServiceBySlug(
  slug: string,
): Promise<ServiceDetailsRecord | null> {
  return getPublishedServiceByIdentifier(slug);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getPublishedServiceByIdentifier(
  identifier: string,
): Promise<ServiceDetailsRecord | null> {
  const supabase = getPublicSupabaseClient();
  const decodedIdentifier = decodeURIComponent(identifier);

  let query = supabase
    .from("services")
    .select(
      "id,category_id,name,slug,description,min_price_cents,max_price_cents,currency,duration_minutes,cover_image_url,is_featured,status,created_at,category:service_categories(id,name,slug,sort_order),details:service_details(what_is_it,who_is_it_for,who_is_it_not_for,meta),detail_items:service_detail_items(id,detail_key,display_label,detail_value,display_order)",
    )
    .eq("status", "published");

  query = isUuid(decodedIdentifier)
    ? query.eq("id", decodedIdentifier)
    : query.eq("slug", decodedIdentifier);

  const { data } = await query.maybeSingle();

  if (!data) return null;

  const typed = data as ServiceDetailsRecord & {
    category: ServiceCategorySummary | ServiceCategorySummary[] | null;
    details:
      | ServiceDetailsRecord["details"]
      | ServiceDetailsRecord["details"][]
      | null;
    detail_items: ServiceDetailItem[] | null;
  };

  const ratingStats = await getServiceRatingStatsByIds(supabase, [typed.id]);
  const ratingStat = ratingStats.get(typed.id);

  return {
    ...typed,
    rating_average: ratingStat?.average ?? null,
    rating_count: ratingStat?.count ?? 0,
    category: toSingle(typed.category),
    details: toSingle(typed.details as ServiceDetailsRecord["details"] | ServiceDetailsRecord["details"][] | null),
    detail_items: (typed.detail_items ?? []).sort(
      (a, b) => a.display_order - b.display_order,
    ),
  };
}

export async function getPublishedReviewsForService(
  serviceId: string,
  limit = 8,
): Promise<ServiceReviewSummary[]> {
  const supabase = getPublicSupabaseClient();
  const safeLimit = Math.max(1, Math.min(limit, 20));

  const { data } = await supabase
    .from("booking_reviews")
    .select("id,rating,review_text,created_at")
    .eq("service_id", serviceId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  return (data ?? []) as ServiceReviewSummary[];
}

export async function getServiceFilterBranches(): Promise<
  ServiceFilterBranchOption[]
> {
  const supabase = getPublicSupabaseClient();
  const { data } = await supabase
    .from("branches")
    .select("id,name,city,country")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (data ?? []) as ServiceFilterBranchOption[];
}

export async function getBranchesForService(
  serviceId: string,
  limit = 10,
): Promise<BranchSummary[]> {
  const supabase = getPublicSupabaseClient();
  const { data } = await supabase
    .from("service_branches")
    .select("branch:branches(id,name,city,country,address,image_url)")
    .eq("service_id", serviceId)
    .eq("is_active", true)
    .limit(limit);

  return ((data ?? []) as Array<{ branch: BranchSummary | BranchSummary[] | null }>)
    .map((row) => toSingle(row.branch))
    .filter((branch): branch is BranchSummary => Boolean(branch));
}

export async function getBookableBranchesForService(
  serviceId: string,
  limit = 10,
): Promise<BranchSummary[]> {
  // Return all branches where the service is offered (via branch_services).
  // Specialist availability is checked at the specialist-selection step,
  // not here — so branches are shown as long as the service is assigned to them.
  return getBranchesForService(serviceId, limit);
}

export async function getSpecialistsForService(params: {
  serviceId: string;
  branchId?: string | null;
}): Promise<SpecialistSummary[]> {
  const supabase = getPublicSupabaseClient();

  // Get specialists who provide this service via specialist_services junction table
  let specialistsQuery = supabase
    .from("specialists")
    .select(`
      id,
      name,
      title,
      bio,
      image_url,
      availability,
      specialist_services!inner(service_id, is_active)
    `)
    .eq("is_active", true)
    .eq("specialist_services.service_id", params.serviceId)
    .eq("specialist_services.is_active", true);

  // Filter by branch via specialist_branches junction table if specified
  if (params.branchId) {
    const { data: branchSpecialists } = await supabase
      .from("specialist_branches")
      .select("specialist_id")
      .eq("branch_id", params.branchId)
      .eq("is_active", true);

    const specialistIds = (branchSpecialists ?? []).map(r => r.specialist_id);
    if (specialistIds.length === 0) return [];
    specialistsQuery = specialistsQuery.in("id", specialistIds);
  }

  const { data } = await specialistsQuery.order("name", { ascending: true });

  return (data ?? []).map(specialist => ({
    id: specialist.id,
    name: specialist.name,
    title: specialist.title,
    bio: specialist.bio,
    image_url: specialist.image_url,
    availability: specialist.availability,
    branch_id: null,
  }));
}

export async function getRelatedServices(params: {
  categoryId: string;
  excludeServiceId: string;
  limit?: number;
}): Promise<ServiceSummary[]> {
  const supabase = getPublicSupabaseClient();
  const { data } = await supabase
    .from("services")
    .select(
      "id,name,slug,description,min_price_cents,max_price_cents,currency,duration_minutes,cover_image_url,is_featured,status,created_at,category:service_categories(id,name,slug,sort_order)",
    )
    .eq("status", "published")
    .eq("category_id", params.categoryId)
    .neq("id", params.excludeServiceId)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 4);

  const baseServices = ((data ?? []) as unknown as RawServiceRow[]).map((service) => ({
      ...service,
      rating_average: null,
      rating_count: 0,
      category: toSingle(service.category),
    }));

  const ratingStats = await getServiceRatingStatsByIds(
    supabase,
    baseServices.map((service) => service.id),
  );

  return baseServices.map((service) => {
    const ratingStat = ratingStats.get(service.id);
    return {
      ...service,
      rating_average: ratingStat?.average ?? null,
      rating_count: ratingStat?.count ?? 0,
    };
  });
}
