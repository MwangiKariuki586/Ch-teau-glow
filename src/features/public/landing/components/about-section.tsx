import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function AboutSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#F9F7F4] py-16">
      <div className="relative z-10 px-[55px]">
        <div className="mx-auto grid items-center gap-12 md:grid-cols-2">
          {/* Left Content */}
          <div>
            <h2 className="mb-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
              Your Journey to
              <br />
              <span className="text-[#c9a961]">Effortless Elegance</span>
            </h2>
            <p className="mb-8 text-base leading-relaxed text-gray-600">
              At Château Glow, we believe beauty is more than skin deep. Our curated collection of premium beauty services and products are designed to enhance your natural radiance and boost your confidence.
            </p>
            
            {/* Stats Card */}
            <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#6B4423] to-[#5a3a20] p-8 shadow-xl">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-[#c9a961]">24+</div>
                  <div className="text-xs text-white/80">Categories</div>
                </div>
                <div className="border-l border-r border-white/20 text-center">
                  <div className="mb-1 text-3xl font-bold text-[#c9a961]">2500+</div>
                  <div className="text-xs text-white/80">Products</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-[#c9a961]">99%</div>
                  <div className="text-xs text-white/80">Satisfied</div>
                </div>
              </div>
            </div>
            
            <Button asChild size="lg" className="rounded-full bg-[#6B4423] px-8 shadow-lg hover:bg-[#4A2C1A]">
              <Link href="/about">Learn More About Us</Link>
            </Button>
          </div>
          
          {/* Right Image Grid */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {/* Top Left */}
              <div className="overflow-hidden rounded-3xl bg-[#c5d5c5] shadow-lg">
                <div className="relative aspect-square">
                  <Image 
                    src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80" 
                    alt="Beauty products" 
                    fill 
                    className="object-cover" 
                  />
                </div>
              </div>
              
              {/* Top Right */}
              <div className="overflow-hidden rounded-3xl bg-[#f5d5c5] shadow-lg">
                <div className="relative aspect-square">
                  <Image 
                    src="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80" 
                    alt="Beauty treatment" 
                    fill 
                    className="object-cover" 
                  />
                </div>
              </div>
              
              {/* Bottom Left */}
              <div className="overflow-hidden rounded-3xl bg-[#d5c5e5] shadow-lg">
                <div className="relative aspect-square">
                  <Image 
                    src="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80" 
                    alt="Skincare products" 
                    fill 
                    className="object-cover" 
                  />
                </div>
              </div>
              
              {/* Bottom Right */}
              <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
                <div className="relative aspect-square">
                  <Image 
                    src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&q=80" 
                    alt="Beauty products" 
                    fill 
                    className="object-cover" 
                  />
                </div>
              </div>
            </div>
            
            {/* 100% Organic Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-white shadow-2xl">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#6B4423]">100%</div>
                  <div className="text-xs font-medium text-gray-600">Organic</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
