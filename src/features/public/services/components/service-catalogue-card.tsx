"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { FavoriteButton } from "@/features/shared/favorite-button";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1526758097130-bab247274f58?w=900&q=80";

export interface ServiceCatalogueCardItem {
  id: number | string;
  name: string;
  category: string;
  description: string | null;
  price: string;
  durationMinutes: number;
  image: string | null;
  detailHref: string;
  bookingHref: string;
  isFeatured?: boolean;
}

export function ServiceCatalogueCard({
  service,
}: {
  service: ServiceCatalogueCardItem;
}) {
  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-[#6B4423]/10 overflow-hidden hover:shadow-md transition-all duration-300">
      <div className="relative h-64 w-full overflow-hidden bg-[#F9F5F0]">
        <Image
          src={service.image || FALLBACK_IMAGE}
          alt={service.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-[#6B4423]">
          {service.category}
        </div>
        {/* Always visible on touch devices, hover-only on desktop */}
        <div className="absolute left-2 top-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
          <FavoriteButton
            serviceId={String(service.id)}
            variant="compact"
            className="h-8 w-8 rounded-full bg-white/90 shadow-md hover:bg-white"
          />
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-serif text-[#2C1A0E]">
            {service.name}
          </h3>
          <span className="text-lg font-medium text-[#2C1A0E]">
            {service.price}
          </span>
        </div>

        <div className="flex items-center text-sm text-[#6B4423]/70 mb-4">
          <Clock className="w-4 h-4 mr-1.5" />
          {service.durationMinutes} min
        </div>

        <p className="text-sm text-[#6B4423]/70 font-light line-clamp-2 mb-6 flex-grow">
          {service.description ?? "Discover this signature treatment."}
        </p>

        <div className="flex gap-3 mt-auto">
          <Link
            href={service.detailHref}
            className="flex-1 bg-[#F9F5F0] text-[#6B4423] text-center py-2.5 rounded-xl text-sm font-medium hover:bg-[#6B4423]/10 transition-colors"
          >
            Details
          </Link>
          <Link
            href={service.bookingHref}
            className="flex-1 bg-[#6B4423] text-white text-center py-2.5 rounded-xl text-sm font-medium hover:bg-[#2C1A0E] transition-colors"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}
