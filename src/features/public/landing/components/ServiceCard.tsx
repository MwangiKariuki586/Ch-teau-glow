"use client";

import Link from "next/link";
import Image from "next/image";
import { Service } from "../data/mockData";
import { ClockIcon } from "lucide-react";

// Map service IDs to available brand images
const serviceImages: Record<string, string> = {
  b4: "/slide2.png",
  s1: "/service_marketplace_hero_2.jpg",
  p1: "/service_marketplace_hero_3.jpg",
  l2: "/slide1.png",
};

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const image = serviceImages[service.id];
  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-[#6B4423]/10 overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
      <div className="h-48 w-full relative overflow-hidden bg-[#F9F5F0]">
        {image ? (
          <Image
            src={image}
            alt={service.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-[#6B4423]/10" />
        )}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-[#6B4423]">
          {service.category}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-serif text-[#2C1A0E]">{service.name}</h3>
          <span className="text-base font-semibold text-[#6B4423]">
            AED {service.price}
          </span>
        </div>

        <div className="flex items-center text-sm text-[#6B4423]/60 mb-4">
          <ClockIcon className="w-4 h-4 mr-1.5" />
          {service.duration}
        </div>

        <p className="text-sm text-[#6B4423]/60 font-light line-clamp-2 mb-6 flex-grow">
          {service.description}
        </p>

        <div className="flex gap-3 mt-auto">
          <Link
            href={`/services/${service.id}`}
            className="flex-1 bg-[#F9F5F0] text-[#6B4423] text-center py-2.5 rounded-xl text-sm font-medium hover:bg-[#6B4423]/10 transition-colors"
          >
            Details
          </Link>
          <Link
            href={`/book?service=${service.id}`}
            className="flex-1 bg-[#6B4423] text-white text-center py-2.5 rounded-xl text-sm font-medium hover:bg-[#c9a961] transition-colors"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}
