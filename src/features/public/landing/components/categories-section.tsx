"use client";

import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    name: "Facial Aesthetics",
    description:
      "Advanced facial treatments and injectables designed to enhance your natural beauty",
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80",
    slug: "facial-aesthetics",
  },
  {
    name: "Laser Treatments",
    description:
      "State-of-the-art laser technology for skin rejuvenation and pigmentation correction",
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&q=80",
    slug: "laser",
  },
  {
    name: "Semi-Permanent Makeup",
    description:
      "Precision brows, lips and lash enhancement for a natural, flawless look",
    image:
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80",
    slug: "makeup",
  },
  {
    name: "Grooming Services",
    description:
      "Professional grooming and styling services tailored to help you look your best",
    image:
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&q=80",
    slug: "grooming",
  },
  {
    name: "Medical Aesthetics",
    description:
      "Clinical-grade beauty solutions combining medical expertise with aesthetic excellence",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80",
    slug: "medical-aesthetics",
  },
];

export function CategoriesSection() {
  return (
    <section className="w-full bg-[#F9F7F4] py-8 sm:py-12 lg:py-16">
      <div className="px-4 sm:px-6 lg:px-13.75">
        {/* Header */}
        <div className="mb-8 sm:mb-10 lg:mb-12 text-center">
          <h2 className="mb-2 sm:mb-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Explore Our Service Categories
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-500">
            From medical aesthetics to semi-permanent makeup, discover
            treatments designed for your unique beauty journey
          </p>
        </div>

        {/* Grid Layout — 3 on top, 2 at bottom (centered) */}
        <div className=" flex gap-5 flex-wrap justify-center">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={{
                pathname: "/services",
                query: { category: category.slug },
              }}
              className={`group flex flex-col w-full sm:w-[340px] lg:w-[360px] rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md`}
            >
              <div className="relative aspect-5/2 w-full overflow-hidden">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="mb-1 text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-[#6B4423] transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
