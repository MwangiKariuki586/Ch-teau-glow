"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    id: 1,
    badge: "Multi-Branch Beauty & Aesthetics Excellence",
    title: "Advanced Beauty",
    titleAccent: "& Medical Aesthetics",
    description:
      "Experience premium beauty treatments across our multiple locations. From medical aesthetics to semi-permanent makeup, we deliver precision and care.",
    image: "/slide2.png",
    showBadges: true,
  },
  {
    id: 2,
    badge: "Medical Aesthetics & Injectables",
    title: "Transform Your Beauty with Expert Care",
    description:
      "Professional medical aesthetics, advanced facials, laser treatments, and grooming services delivered by certified specialists",
    image: "/slide 1.png",
    showBadges: false,
  },

  {
    id: 3,
    badge: "Premium Skincare & Retail",
    title: "Luxury Skincare Products & Treatments",
    description:
      "Shop premium beauty products and book bespoke treatments designed for your unique beauty journey",
    image: "/slide.png",
    showBadges: false,
  },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const slide = slides[currentSlide];

  return (
    <section className="relative flex  w-full items-end overflow-hidden min-h-screen">
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0 z-0">
        {slides.map((slideItem, index) => (
          <div
            key={slideItem.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={slideItem.image}
              alt={slideItem.title}
              fill
              className="object-cover animate-ken-burns"
              priority={index === 0}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
      </div>

      <div className="relative z-10 w-full px-13.75 py-12 md:py-16">
        <div className="grid items-end gap-8 md:grid-cols-2">
          <div className="space-y-6 pb-8">
            {/* Staggered Animated Content */}
            <div key={`content-${currentSlide}`} className="space-y-6">
              {slide.badge && (
                <div
                  className="flex items-center gap-2 text-white mb-6 animate-fade-in-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                    <CheckCircle className="h-4.5 w-4.5 text-[#6B4423]" />
                  </div>
                  <span className="text-sm font-medium uppercase tracking-wider">
                    {slide.badge}
                  </span>
                </div>
              )}

              <h1
                className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.4s" }}
              >
                {slide.title}
                {slide.titleAccent && (
                  <>
                    <br />
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-white to-[#c9a961] animate-gradient">
                      {slide.titleAccent}
                    </span>
                  </>
                )}
              </h1>

              <p
                className="max-w-lg text-base text-white/90 md:text-lg leading-relaxed mb-8 animate-fade-in-up"
                style={{ animationDelay: "0.6s" }}
              >
                {slide.description}
              </p>

              <div
                className="flex flex-col gap-4 sm:flex-row animate-fade-in-up"
                style={{ animationDelay: "0.8s" }}
              >
                <Button
                  asChild
                  size="lg"
                  className="group rounded-full bg-linear-to-r from-[#6B4423] to-[#8B5A2B] hover:from-[#5A3A1D] hover:to-[#6B4423] transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Link href="/services">
                    Book Online Now
                    <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform duration-300" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-2 border-white bg-transparent text-white hover:bg-white hover:text-[#6B4423] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <Link href="/products">View All Products</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Slide Indicators & Navigation */}
        <div className="flex items-center justify-end gap-6 pb-4 pt-8">
          <div className="flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1 rounded-full transition-all duration-500 hover:scale-110 ${
                  index === currentSlide
                    ? "w-12 bg-linear-to-r from-white to-[#c9a961] shadow-lg"
                    : "w-4 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={prevSlide}
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-[#6B4423] transition-all duration-300 hover:scale-110 hover:shadow-lg"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              onClick={nextSlide}
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-[#6B4423] transition-all duration-300 hover:scale-110 hover:shadow-lg"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
