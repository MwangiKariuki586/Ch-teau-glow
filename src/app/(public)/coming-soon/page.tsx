import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] px-6 pb-20 pt-32 sm:px-[55px]">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-[32px] border border-[#C9A96E]/25 bg-gradient-to-br from-[#FFF8EE] via-white to-[#F3ECE3] p-10 text-center shadow-sm sm:p-14">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#6B4423]/10">
            <Sparkles className="h-8 w-8 text-[#6B4423]" />
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#B08A56]">
            Coming Soon
          </p>
          <h1
            className="text-4xl font-bold text-[#2C1A12] sm:text-5xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Beauty Packages Are On The Way
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#6B5A4D]">
            We&apos;re putting the final touches on our next beauty package
            experience. These plans will be available to book soon.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              className="rounded-full bg-[#6B4423] px-7 text-white hover:bg-[#4A2C1A]"
            >
              <Link href="/offers">Back to Offers</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#6B4423]/20 px-7 text-[#6B4423] hover:bg-[#FFF8EE]"
            >
              <Link href="/services">Explore Services</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
