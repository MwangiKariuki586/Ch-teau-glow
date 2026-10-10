import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .select(
      "id,name,slug,description,package_type,price_cents,compare_at_cents,currency,save_label,badge,image_url,sort_order,package_items(quantity,display_order,service:services(id,name,slug,duration_minutes))",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to load package." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  const services = (data.package_items ?? [])
    .map((item) => {
      const service = Array.isArray(item.service)
        ? (item.service[0] ?? null)
        : item.service;

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
    .filter(
      (
        item,
      ): item is {
        id: string;
        name: string;
        slug: string;
        duration_minutes: number;
        quantity: number;
        display_order: number;
      } => Boolean(item),
    )
    .sort((a, b) => a.display_order - b.display_order);

  return NextResponse.json({
    data: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      package_type: data.package_type,
      price_cents: data.price_cents,
      compare_at_cents: data.compare_at_cents,
      currency: data.currency,
      save_label: data.save_label,
      badge: data.badge,
      image_url: data.image_url,
      sort_order: data.sort_order,
      services,
    },
  });
}
