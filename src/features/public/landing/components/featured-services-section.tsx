import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function FeaturedServicesSection() {
  return (
    <section className="w-full bg-white py-8">
      <div className="px-[55px]">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative min-h-[400px] overflow-hidden rounded-3xl bg-white shadow-lg">
            <div className="absolute inset-0">
              <Image
                src="https://images.unsplash.com/photo-1612817288484-6f916006741a?w=1000&q=80"
                alt="Luminous Alchemy"
                fill
                className="object-cover"
              />
            </div>

            <div className="relative grid min-h-[650px] md:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-center bg-white/15 p-8 backdrop-blur-sm md:p-10">
                <Badge className="mb-4 w-fit rounded-full bg-[#c9a961] px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-white hover:bg-[#c9a961]">
                  Private Label
                </Badge>
                
                <h2 className="mb-3 text-4xl font-bold text-gray-900 md:text-5xl">
                  Luminous
                  <br />
                  <span className="text-[#c9a961]">Alchemy</span>
                </h2>
                
                <p className="mb-6 text-gray-600">
                  Science-led formulas that transcend traditional skincare boundaries.
                </p>
                
                <Button asChild size="lg" className="w-fit rounded-full bg-[#6B4423] hover:bg-[#4A2C1A]">
                  <Link href="/products">
                    Buy Now <ArrowRight className="ml-2 h-[18px] w-[18px]" />
                  </Link>
                </Button>
              </div>

              <div className="relative" />
            </div>
          </div>

          <div className="relative min-h-[400px] overflow-hidden rounded-3xl bg-[#6B4423] shadow-lg">
            <div className="absolute inset-0">
              <Image
                src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80"
                alt="Bespoke Wellness"
                fill
                className="object-cover"
              />
            </div>

            <div className="relative grid min-h-[650px] md:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-center bg-[#6B4423]/15 p-8 backdrop-blur-sm md:p-10">
                <Badge className="mb-4 w-fit rounded-full bg-[#c9a961] px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-white hover:bg-[#c9a961]">
                  Clinical Artistry
                </Badge>
                
                <h2 className="mb-3 text-4xl font-bold text-white md:text-5xl">
                  Bespoke
                  <br />
                  <span className="text-[#c9a961]">Wellness</span>
                </h2>
                
                <p className="mb-6 text-white/90">
                  Expert treatments tailored to your unique skin profile and life rhythm.
                </p>
                
                <Button asChild size="lg" variant="secondary" className="w-fit rounded-full bg-white text-[#6B4423] hover:bg-gray-100">
                  <Link href="/services">
                    Book Session <ArrowRight className="ml-2 h-[18px] w-[18px]" />
                  </Link>
                </Button>
              </div>

              <div className="relative" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
