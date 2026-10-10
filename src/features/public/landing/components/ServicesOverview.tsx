"use client";

import Link from "next/link";
import {
  SparklesIcon,
  EyeIcon,
  SmileIcon,
  DropletsIcon,
  ScissorsIcon,
  HeartIcon,
} from "lucide-react";

const categories = [
  {
    id: "facial-aesthetics",
    name: "Facial Aesthetics",
    slug: "facial-aesthetics",
    description: "Advanced facial treatments and injectables designed to enhance your natural beauty",
    icon: DropletsIcon,
  },
  {
    id: "laser-treatments",
    name: "Laser Treatments",
    slug: "laser-treatments",
    description: "State-of-the-art laser technology for skin rejuvenation and pigmentation correction",
    icon: SparklesIcon,
  },
  {
    id: "semi-permanent-makeup",
    name: "Semi-Permanent Makeup",
    slug: "semi-permanent-makeup",
    description: "Precision brows, lips and lash enhancement for a natural, flawless look",
    icon: EyeIcon,
  },
  {
    id: "grooming-services",
    name: "Grooming Services",
    slug: "grooming-services",
    description: "Professional grooming and styling services tailored to help you look your best",
    icon: ScissorsIcon,
  },
  {
    id: "medical-aesthetics",
    name: "Medical Aesthetics",
    slug: "medical-aesthetics",
    description: "Clinical-grade beauty solutions combining medical expertise with aesthetic excellence",
    icon: HeartIcon,
  },
  {
    id: "body-contouring",
    name: "Body Contouring",
    slug: "body-contouring",
    description: "Non-invasive body sculpting treatments to shape and tone your silhouette",
    icon: SmileIcon,
  },
];

export function ServicesOverview() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16">
          <div className="max-w-2xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-xs font-semibold uppercase tracking-widest mb-4">
              Bespoke treatments
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-[#2C1A0E] mb-4">
              Celebrate Your Natural Beauty
            </h2>
            <p className="text-[#6B4423]/70 font-light text-lg">
              Exclusive plans, designed to flaunt your favourite features
            </p>
          </div>
          {/* <Link
            href="/services"
            className="text-sm font-semibold text-[#6B4423] hover:text-[#c9a961] transition-colors mt-6 md:mt-0"
          >
            View all services &rarr;
          </Link> */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                href={`/services?category=${category.slug}`}
                className="group block p-8 bg-[#F9F5F0] rounded-2xl border border-[#6B4423]/10 hover:shadow-md hover:border-[#c9a961]/40 transition-all duration-300 h-full"
              >
                <div className="w-12 h-12 bg-[#6B4423] rounded-full flex items-center justify-center mb-6 text-white shadow-sm group-hover:bg-[#c9a961] transition-colors duration-300">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-serif text-[#2C1A0E] mb-2">
                  {category.name}
                </h3>
                <p className="text-[#6B4423]/60 text-sm font-light leading-relaxed">
                  {category.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
