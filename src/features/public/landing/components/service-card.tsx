"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock3, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/features/shared/favorite-button";

export interface ServiceCardItem {
  id: number | string;
  name: string;
  category: string;
  price: string;
  rating: number | null;
  ratingCount: number;
  durationMinutes: number;
  image: string;
  link: string;
}

interface ServiceCardProps {
  service: ServiceCardItem;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const router = useRouter();

  // Navigate to service detail page (logic unchanged)
  const handleNavigate = () => {
    router.push(service.link);
  };

  // Prevent inner interactive elements from triggering card navigation
  const handleCardClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="button"]')) {
      return;
    }
    handleNavigate();
  };

  return (
    /*
     * Card shell: warm white, soft border, rounded-2xl.
     * Hover: gentle lift (translate-y) + deeper shadow.
     * motion-reduce: removes transform animation for accessibility.
     */
    <article
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleNavigate();
        }
      }}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#ede9e3] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B4423]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* ── Favorite button (top-right, revealed on hover) ── */}
      <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <FavoriteButton
          serviceId={String(service.id)}
          variant="compact"
          className="h-8 w-8 rounded-full bg-white/90 shadow-md hover:bg-white"
        />
      </div>

      {/*
       * Image area: fixed 4:3 aspect ratio for visual consistency across
       * cards regardless of source image dimensions.
       */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-linear-to-br from-[#f5ede4] to-[#e8ddd2]">
        <Image
          src={service.image}
          alt={service.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
        />
        {/*
         * Subtle category badge overlaid on image bottom,
         * keeps it visible but understated.
         */}
        <span className="absolute bottom-3 left-3 inline-block rounded-full bg-black/40 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          {service.category}
        </span>
      </div>

      {/* ── Card content ── */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Service name — primary text */}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900">
          {service.name}
        </h3>

        {/* Meta row: rating + duration */}
        <div className="flex items-center gap-3 text-sm">
          {service.ratingCount > 0 && service.rating !== null ? (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[#c9a961] text-[#c9a961]" />
              <span className="font-semibold text-gray-800">
                {service.rating.toFixed(1)}
              </span>
              <span className="text-xs text-[#9c8570]">
                ({service.ratingCount})
              </span>
            </div>
          ) : (
            /* Calmer "new service" placeholder instead of "No reviews yet" */
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-[#ddd6cd]" />
              <span className="text-xs text-[#b8a899]">New service</span>
            </div>
          )}

          <span className="text-[#ddd6cd]">·</span>

          <div className="flex items-center gap-1 text-[#9c8570]">
            <Clock3 className="h-3.5 w-3.5" />
            <span className="text-xs">{service.durationMinutes} min</span>
          </div>
        </div>

        {/* Price */}
        <p className="text-lg font-bold text-[#c9a961]">{service.price}</p>

        {/*
         * Book CTA — cocoa filled, full-width, rounded pill.
         * hover:bg-[#4A2C1A] matches landing page button style.
         * onClick uses handleNavigate (unchanged behavior).
         */}
        <Button
          type="button"
          onClick={handleNavigate}
          className="mt-auto h-10 w-full rounded-full bg-[#6B4423] text-sm font-medium text-white transition-colors hover:bg-[#4A2C1A] focus-visible:ring-2 focus-visible:ring-[#6B4423]/50"
        >
          Book
        </Button>
      </div>
    </article>
  );
}
