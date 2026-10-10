"use client";

import Link from "next/link";
import { offers } from "../data/mockData";

export function OffersSection() {
  const mainOffer = offers[0];
  return (
    <section className="py-12 bg-[#F9F5F0]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="bg-[#6B4423] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-white max-w-xl">
            <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-medium mb-4 tracking-widest uppercase">
              Special Offer
            </span>
            <h2 className="text-3xl font-serif mb-3">{mainOffer.title}</h2>
            <p className="text-white/70 font-light">{mainOffer.description}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <Link
              href="/offers"
              className="bg-[#c9a961] text-[#2C1A0E] px-8 py-4 rounded-xl font-semibold hover:bg-[#b8963f] transition-colors text-center w-full sm:w-auto whitespace-nowrap shadow-lg"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
