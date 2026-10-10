"use client";

import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-24 bg-[#6B4423] text-center">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-widest mb-4">
            Get Started
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">
            Ready to elevate your beauty routine?
          </h2>
          <p className="text-white/80 font-light text-lg mb-10 max-w-xl mx-auto">
            Book your consultation today and let our experts design a personalized
            treatment plan just for you.
          </p>
          <Link
            href="/book"
            className="inline-block bg-white text-[#6B4423] px-10 py-4 rounded-full font-semibold hover:bg-[#F9F5F0] transition-colors shadow-lg"
          >
            Book Your Appointment
          </Link>
        </div>
      </div>
    </section>
  );
}
