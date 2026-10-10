"use client";

import { useEffect, useRef } from 'react';

export function PressSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const mediaLogos = [
    "GRAZIA",
    "GULF NEWS",
    "BAZAAR",
    "WOMAN",
    "COSMOPOLITAN",
    "VOGUE",
    "ELLE",
    "HARPER'S BAZAAR",
  ];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const scroll = () => {
      scrollPosition += scrollSpeed;
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      scrollContainer.scrollLeft = scrollPosition;
    };

    const intervalId = setInterval(scroll, 20);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <section className="py-20 bg-[#F9F5F0]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-stone-500 mb-4">
            Press
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4">
            As Seen In
          </h2>
          <p className="text-stone-600 font-light">
            Château Glow has been featured in the top media outlets across the region.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative overflow-hidden">
          <div
            ref={scrollRef}
            className="flex gap-16 overflow-x-hidden"
            style={{ scrollBehavior: 'auto' }}
          >
            {/* Duplicate logos for seamless loop */}
            {[...mediaLogos, ...mediaLogos, ...mediaLogos].map((logo, index) => (
              <div
                key={index}
                className="flex-shrink-0 text-2xl md:text-3xl font-serif text-stone-900 tracking-wider opacity-60 hover:opacity-100 transition-opacity"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
