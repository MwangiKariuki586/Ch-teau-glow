export type PlanTier = "starter" | "radiance" | "luxury";
export type PlanBenefitCategory =
  | "booking"
  | "consultation"
  | "shop"
  | "offers"
  | "support"
  | "loyalty";

export type PlanBenefit = {
  title: string;
  description: string;
  category: PlanBenefitCategory;
  icon?: string;
};

export type Plan = {
  slug: PlanTier;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
  priceLabel: string;
  priceCents: number;
  currency: "AED";
  interval: "month";
  highlights: string[];
  benefits: PlanBenefit[];
  finePrint: string[];
  stripePriceId?: string;
};

const STRIPE_PRICE_IDS: Record<PlanTier, string | undefined> = {
  starter: process.env.NEXT_PUBLIC_STRIPE_PLAN_STARTER_PRICE_ID,
  radiance: process.env.NEXT_PUBLIC_STRIPE_PLAN_RADIANCE_PRICE_ID,
  luxury: process.env.NEXT_PUBLIC_STRIPE_PLAN_LUXURY_PRICE_ID,
};

export const PLAN_CATALOG: Record<PlanTier, Plan> = {
  starter: {
    slug: "starter",
    name: "Starter",
    tagline: "A calm entry membership for clients who want smoother visits across Château Glow.",
    description:
      "Starter brings the core Château Glow journey together with earlier booking access, a monthly consultation touchpoint, and light perks across products, offers, and member communications.",
    badge: "Everyday ease",
    priceLabel: "AED 149 / month",
    priceCents: 14900,
    currency: "AED",
    interval: "month",
    highlights: [
      "Priority access to selected booking windows before general release",
      "One complimentary beauty or brow consultation each month",
      "Member-only notice on selected offers and packages",
      "5% off selected products or aftercare essentials",
      "Birthday-month perk on one eligible booking or shop order",
    ],
    benefits: [
      {
        title: "Earlier booking access",
        description: "See selected appointment windows before they open to general booking traffic.",
        category: "booking",
        icon: "calendar",
      },
      {
        title: "Monthly consultation included",
        description: "Book one complimentary beauty or brow consultation for treatment or product guidance each month.",
        category: "consultation",
        icon: "sparkles",
      },
      {
        title: "Product and aftercare savings",
        description: "Receive 5% off selected products and aftercare essentials through the shop experience.",
        category: "shop",
        icon: "percent",
      },
      {
        title: "Member access to offers",
        description: "Get advance notice on selected offers, packages, and limited campaigns before wider promotion.",
        category: "offers",
        icon: "gift",
      },
      {
        title: "Birthday booking or order perk",
        description: "Use one birthday-month perk on an eligible appointment or shop checkout while your membership is active.",
        category: "loyalty",
        icon: "cake",
      },
      {
        title: "Member reminders",
        description: "Stay in the member communication lane for plan updates, selected reminders, and relevant perk prompts.",
        category: "support",
        icon: "calendar",
      },
    ],
    finePrint: [
      "Benefits apply while the membership is active and only on eligible bookings, products, offers, or packages.",
      "Complimentary consultations are subject to studio availability and do not roll over into the next billing cycle.",
      "Member pricing on products, aftercare, and services cannot be combined with every promotion or bundle.",
    ],
    stripePriceId: STRIPE_PRICE_IDS.starter,
  },
  radiance: {
    slug: "radiance",
    name: "Radiance",
    tagline: "A balanced membership for clients who want stronger convenience across every touchpoint.",
    description:
      "Radiance is built for regular Château Glow clients who want easier rebooking, stronger savings, and earlier access across bookings, consultations, products, and curated offers.",
    badge: "Most popular",
    priceLabel: "AED 289 / month",
    priceCents: 28900,
    currency: "AED",
    interval: "month",
    highlights: [
      "Earlier booking window plus faster rescheduling assistance",
      "One premium consultation each month with product or treatment recommendations",
      "Early access to offers, curated packages, and selected launches",
      "8% off selected products, aftercare, and eligible services",
      "Rebooking perk after completed appointments",
      "Birthday-month perk with stronger value than Starter",
    ],
    benefits: [
      {
        title: "Extended booking priority",
        description: "Unlock an earlier booking window and smoother access to selected high-demand appointment slots.",
        category: "booking",
        icon: "calendar",
      },
      {
        title: "Premium monthly consultation",
        description: "Use one premium consultation monthly for product recommendations, treatment planning, or beauty guidance.",
        category: "consultation",
        icon: "sparkles",
      },
      {
        title: "Cross-platform member savings",
        description: "Receive 8% off selected products, aftercare essentials, and eligible services where membership pricing applies.",
        category: "shop",
        icon: "percent",
      },
      {
        title: "Early access to launches and packages",
        description: "Preview curated packages, selected launches, and members-first offers before they are widely promoted.",
        category: "offers",
        icon: "gift",
      },
      {
        title: "Faster rescheduling help",
        description: "Get quicker support when you need to adjust an appointment and keep your treatment rhythm intact.",
        category: "support",
        icon: "headset",
      },
      {
        title: "Rebooking and birthday perks",
        description: "Access a rebooking benefit after completed appointments plus a stronger birthday-month perk than Starter.",
        category: "loyalty",
        icon: "cake",
      },
    ],
    finePrint: [
      "Eligible savings and access vary by service, product, package, and campaign and are applied only where marked for members.",
      "Consultation inclusions and rebooking perks are limited to eligible uses within the active billing month.",
      "Priority support speeds help with changes and questions but does not guarantee same-day slot availability.",
    ],
    stripePriceId: STRIPE_PRICE_IDS.radiance,
  },
  luxury: {
    slug: "luxury",
    name: "Luxury",
    tagline: "A high-touch membership for clients who want Château Glow to feel easier at every step.",
    description:
      "Luxury is the fullest Château Glow membership experience, combining first-priority booking access, concierge-style support, premium consultations, and elevated platform-wide perks.",
    badge: "Exclusive",
    priceLabel: "AED 459 / month",
    priceCents: 45900,
    currency: "AED",
    interval: "month",
    highlights: [
      "First-priority booking access on newly opened slots",
      "Concierge-style support for booking changes and scheduling help",
      "Premium monthly consultation plus selected complimentary add-on eligibility",
      "10% off selected products, aftercare, and eligible services",
      "First access to premium packages, launches, and limited campaigns",
      "Elevated birthday perk and surprise VIP treatment moments",
    ],
    benefits: [
      {
        title: "First-priority booking access",
        description: "Get first look at selected newly opened slots and top-tier priority around high-demand booking windows.",
        category: "booking",
        icon: "calendar",
      },
      {
        title: "Premium consultation and add-on access",
        description: "Use a monthly premium consultation and unlock selected complimentary add-on eligibility where marked.",
        category: "consultation",
        icon: "sparkles",
      },
      {
        title: "Highest member savings",
        description: "Receive 10% off selected products, aftercare items, and eligible services across the Château Glow journey.",
        category: "shop",
        icon: "percent",
      },
      {
        title: "First access to premium drops",
        description: "See selected premium packages, limited campaigns, and launches first when members-only access applies.",
        category: "offers",
        icon: "gift",
      },
      {
        title: "Concierge-style member support",
        description: "Get faster help with booking changes, plan questions, reminders, and scheduling coordination.",
        category: "support",
        icon: "headset",
      },
      {
        title: "Elevated loyalty moments",
        description: "Receive an elevated birthday-month perk plus occasional surprise VIP touches during the active term.",
        category: "loyalty",
        icon: "cake",
      },
    ],
    finePrint: [
      "Luxury pricing, access, and complimentary extras apply only to eligible bookings, products, aftercare, and campaigns identified for members.",
      "Concierge-style support improves response and coordination but does not guarantee instant confirmations or unlimited changes.",
      "Membership benefits are personal, non-transferable, and do not create a stored credit, wallet, or entitlement balance.",
    ],
    stripePriceId: STRIPE_PRICE_IDS.luxury,
  },
};

export const plans = Object.values(PLAN_CATALOG);

export function isPlanTier(value: string): value is PlanTier {
  return value in PLAN_CATALOG;
}

export function getPlanBySlug(slug: string): Plan | null {
  return isPlanTier(slug) ? PLAN_CATALOG[slug] : null;
}
