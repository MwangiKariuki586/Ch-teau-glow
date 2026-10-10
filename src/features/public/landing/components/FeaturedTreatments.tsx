import Link from "next/link";
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

export async function FeaturedTreatments() {
  let rows: ServiceRow[] = [];
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("services")
      .select(
        `id, name, slug, description,
       min_price_cents, currency, duration_minutes,
       cover_image_url, is_featured,
       category:service_categories!inner(name)`,
      )
      .eq("status", "published")
      .neq("service_categories.name", "Consultations")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3);

    rows = (data ?? []) as ServiceRow[];
  } catch {
    // Build-time prerender without Supabase env, or DB unreachable:
    // render nothing instead of failing the whole page build.
    return null;
  }
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
      isFeatured: s.is_featured,
    };
  });

  return (
    <section className="py-24 bg-[#F9F5F0]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-xs font-semibold uppercase tracking-widest mb-4">
            Most Popular
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-[#2C1A0E] mb-4">
            Signature Services
          </h2>
          <p className="text-[#6B4423]/70 font-light text-lg max-w-2xl">
            Our most sought-after treatments, perfected by our expert specialists.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCatalogueCard key={service.id} service={service} />
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#6B4423]/30 px-6 py-3 text-sm font-semibold text-[#6B4423] transition hover:border-[#6B4423] hover:bg-[#6B4423] hover:text-white"
          >
            View All Services &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
