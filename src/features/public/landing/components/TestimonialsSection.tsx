"use client";

import { StarIcon } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Sarah M.",
    service: "Microblading",
    quote:
      "The attention to detail is unmatched. My brows have never looked this perfect and natural. The luxury experience from start to finish makes Château Glow my only choice in Dubai.",
  },
  {
    id: 2,
    name: "Aisha K.",
    service: "Hydrafacial",
    quote:
      "A truly transformative experience. The clinic is beautiful, the staff is incredibly professional, and my skin is glowing. Highly recommend their signature facials.",
  },
  {
    id: 3,
    name: "Elena R.",
    service: "Lip Blush",
    quote:
      "I was nervous about lip blush, but the consultation put me completely at ease. The result is exactly the subtle, natural enhancement I was looking for.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-[#F9F5F0]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-xs font-semibold uppercase tracking-widest mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-[#2C1A0E] mb-4">
            Client Experiences
          </h2>
          <p className="text-[#6B4423]/70 font-light text-lg max-w-2xl">
            Hear from our community of confident clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white p-8 rounded-2xl border border-[#6B4423]/10 shadow-sm"
            >
              <div className="flex text-[#c9a961] mb-6">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-[#2C1A0E]/70 font-light mb-8 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#6B4423]/10 flex items-center justify-center text-[#6B4423] font-serif font-semibold text-sm">
                  {testimonial.name[0]}
                </div>
                <div>
                  <h4 className="font-serif text-[#2C1A0E] font-semibold">
                    {testimonial.name}
                  </h4>
                  <span className="text-xs text-[#6B4423]/60">
                    {testimonial.service}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
