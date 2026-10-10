'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Mitchell',
    role: 'Facial Aesthetics Client',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    rating: 5,
    text: 'The facial aesthetics treatment completely transformed my confidence. The team is professional, caring, and truly experts in their field.',
  },
  {
    id: 2,
    name: 'Emily Rodriguez',
    role: 'Semi-Permanent Makeup',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    rating: 5,
    text: 'My microblading experience was exceptional. The precision and attention to detail were outstanding. I wake up every morning loving my brows.',
  },
  {
    id: 3,
    name: 'Jessica Thompson',
    role: 'Laser Treatment Client',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    rating: 5,
    text: 'The laser treatments have given me the clear, radiant skin I\'ve always wanted. The staff made me feel comfortable throughout the entire process.',
  },
  {
    id: 4,
    name: 'Amanda Chen',
    role: 'Medical Aesthetics',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
    rating: 5,
    text: 'Château Glow offers the most advanced medical aesthetics treatments. The results exceeded my expectations and the care I received was exceptional.',
  },
];

export function TestimonialsSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="w-full bg-[#F9F7F4] py-10 sm:py-12 lg:py-16">
      <div className="px-4 sm:px-6 lg:px-13.75">
        {/* Header */}
        <div className="mb-10 text-center sm:mb-12 lg:mb-16">
          <h2 className="mb-3 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
            Trusted by Thousands
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-600 sm:text-base lg:text-lg">
            Discover why our clients choose Château Glow for their beauty and wellness journey
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={cn(
                'group relative flex h-full flex-col overflow-hidden rounded-3xl bg-linear-to-br from-gray-50 to-white p-5 shadow-md transition-all duration-300 sm:p-6 lg:p-7',
                hoveredIndex === index && 'shadow-xl md:-translate-y-2'
              )}
            >
              {/* Decorative Element */}
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-[#c9a961]/10 sm:h-28 sm:w-28 lg:h-32 lg:w-32 lg:translate-x-8 lg:-translate-y-8" />
              
              {/* Client Image */}
              <div className="relative z-10 mb-4 sm:mb-5 lg:mb-6">
                <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-[#c9a961]/30 sm:h-16 sm:w-16">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Stars */}
              <div className="relative z-10 mb-3 flex gap-1 sm:mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#c9a961] text-[#c9a961]" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="relative z-10 mb-5 grow text-sm leading-relaxed text-gray-700 sm:mb-6">
                "{testimonial.text}"
              </p>

              {/* Client Info */}
              <div className="relative z-10">
                <h4 className="text-sm font-bold text-gray-900 sm:text-base">{testimonial.name}</h4>
                <p className="text-xs text-gray-500">{testimonial.role}</p>
              </div>

              {/* Hover Border */}
              <div
                className={cn(
                  'absolute inset-0 rounded-3xl border-2 border-transparent transition-colors',
                  hoveredIndex === index && 'border-[#c9a961]'
                )}
              />
            </div>
          ))}
        </div>

      
      </div>
    </section>
  );
}
