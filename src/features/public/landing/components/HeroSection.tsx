"use client";

import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex items-center bg-[#F9F5F0] pt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid md:grid-cols-2 gap-16 items-center">
        {/* Left: Text */}
        <div className="max-w-xl">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-xs font-semibold uppercase tracking-widest mb-6">
            UAE'S #1 beauty brand
          </span>
          <h1 className="text-5xl md:text-7xl font-serif text-[#2C1A0E] leading-[1.1] mb-6">
            Enhance your <br />
            <span className="italic text-[#6B4423]">natural</span> beauty.
          </h1>
          <p className="text-lg text-[#6B4423]/70 mb-10 leading-relaxed font-light">
            The highest standards of innovation and personalisation in beauty.

          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/services"
              className="bg-[#6B4423] text-white px-8 py-4 rounded-full font-medium hover:bg-[#5A3A1D] transition-colors text-center shadow-lg"
            >
              Book Appointment
            </Link>
            <Link
              href="/products"
              className="bg-white text-[#6B4423] px-8 py-4 rounded-full font-medium border-2 border-[#6B4423]/30 hover:border-[#6B4423] transition-colors text-center"
            >
              Explore Products
            </Link>
          </div>
        </div>

        {/* Right: Brand image */}
        <div className="hidden md:block relative h-[600px] rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src="/slide2.png"
            alt="Château Glow Beauty Studio"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2C1A0E]/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
