import Link from "next/link";
import { Button } from "@/components/ui/button";

export function VideoSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#6B4423]/10 text-[#6B4423] text-xs font-semibold uppercase tracking-widest">
              Featured treatment
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-[#2C1A0E]">
              Microblading
            </h2>
            <p className="text-lg text-[#6B4423]/70 font-light">
              Fuller brows customized to suit your bone structure
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                asChild
                className="rounded-full bg-[#6B4423] px-8 py-6 text-base hover:bg-[#4A2C1A]"
              >
                <Link href="/services">Book Online</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-2 border-[#6B4423] text-[#6B4423] px-8 py-6 text-base hover:bg-[#6B4423] hover:text-white"
              >
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>

          {/* Right: Video */}
          <div className="relative rounded-2xl overflow-hidden shadow-lg">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-auto"
            >
              <source
                src="https://cdn.shopify.com/videos/c/o/v/bbef6ea781c5439e9ffba69d194b614a.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}
