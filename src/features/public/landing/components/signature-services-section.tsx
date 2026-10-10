import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ServiceCatalogueCard } from "@/features/public/services/components/service-catalogue-card";
import { formatMoney } from "@/features/public/services/lib/service-data";

type ServiceCategory = { name: string } | null;
type ServiceRow = {
  id: number | string;
  name: string;
  slug: string;
  description: string | null;
  min_price_cents: number;
  currency: string;
  duration_minutes: number;
  cover_image_url: string | null;
  is_featured: boolean;
  category: ServiceCategory | ServiceCategory[];
};

export async function SignatureServicesSection() {
  const supabase = await createClient();

  // Single query: featured first, then any published — no waterfall fallback
  const { data } = await supabase
    .from("services")
    .select(
      `
      id, name, slug, description,
      min_price_cents, max_price_cents, currency,
      duration_minutes, cover_image_url, is_featured,
      category:service_categories(name)
    `,
    )
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(4);

  const rows = (data ?? []) as ServiceRow[];
  if (!rows.length) return null;

  const services = rows.map((s) => {
    const cat = Array.isArray(s.category) ? s.category[0] : s.category;
    return {
      id: s.id,
      name: s.name,
      category: cat?.name ?? "Service",
      description: s.description,
      price: formatMoney(s.min_price_cents, s.currency),
      durationMinutes: s.duration_minutes,
      image: s.cover_image_url,
      detailHref: `/services/${s.slug}`,
      bookingHref: `/book?service=${encodeURIComponent(s.slug)}`,
      isFeatured: true,
    };
  });

  return (
    <section className="w-full bg-[#F9F7F4] py-10 sm:py-12 lg:py-16">
      <div className="px-4 sm:px-6 lg:px-13.75">
        {/* Header */}
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="mb-3 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
            Signature Services
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-500 sm:text-base">
            Our most sought-after treatments, perfected by our expert
            specialists.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {services.map((service) => (
            <ServiceCatalogueCard key={service.id} service={service} />
          ))}
        </div>

        {/* View all */}
        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-[#6B4423] hover:text-[#6B4423] sm:px-6 sm:py-3"
          >
            View All Services
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
