import { Suspense } from "react";
import { HeroSection } from "./HeroSection";
import { OffersSection } from "./OffersSection";
import { ServicesOverview } from "./ServicesOverview";
import { FeaturedTreatments } from "./FeaturedTreatments";
import { ShopPreview } from "./ShopPreview";
import { TestimonialsSection } from "./TestimonialsSection";
import { VideoSection } from "./VideoSection";
import { CTASection } from "./CTASection";

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 md:px-12 max-w-7xl mx-auto py-24">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-2xl bg-[#6B4423]/10" />
      ))}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="w-full pt-20">
      <HeroSection />
      <OffersSection />
      <ServicesOverview />
      <Suspense fallback={<CardsSkeleton />}>
        <FeaturedTreatments />
      </Suspense>
      <Suspense fallback={<CardsSkeleton />}>
        <ShopPreview />
      </Suspense>
      <TestimonialsSection />
      <VideoSection />
      <CTASection />
    </div>
  );
}
