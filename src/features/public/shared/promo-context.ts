export interface PromoContext {
  offerId?: string | null;
  code?: string | null;
  packageSlug?: string | null;
}

export function humanizeSlug(value?: string | null) {
  if (!value) return null;
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizePromoContext(context?: PromoContext | null): PromoContext | null {
  if (!context) return null;

  const next: PromoContext = {
    offerId: context.offerId?.trim() || undefined,
    code: context.code?.trim() || undefined,
    packageSlug: context.packageSlug?.trim() || undefined,
  };

  if (!next.offerId && !next.code && !next.packageSlug) {
    return null;
  }

  return next;
}

export function buildPromoSearchParams(context?: PromoContext | null) {
  const normalized = normalizePromoContext(context);
  const params = new URLSearchParams();

  if (!normalized) return params;
  if (normalized.offerId) params.set("offer", normalized.offerId);
  if (normalized.code) params.set("code", normalized.code);
  if (normalized.packageSlug) params.set("package", normalized.packageSlug);

  return params;
}

export function appendPromoContext(
  href: string,
  context?: PromoContext | null,
  extras?: Record<string, string | null | undefined>,
) {
  const [pathname, existingQuery = ""] = href.split("?");
  const params = new URLSearchParams(existingQuery);
  const promoParams = buildPromoSearchParams(context);

  for (const [key, value] of promoParams.entries()) {
    params.set(key, value);
  }

  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value) {
        params.set(key, value);
      }
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getPromoContextFromSearchParams(searchParams?: {
  offer?: string;
  code?: string;
  package?: string;
}) {
  return normalizePromoContext({
    offerId: searchParams?.offer,
    code: searchParams?.code,
    packageSlug: searchParams?.package,
  });
}
