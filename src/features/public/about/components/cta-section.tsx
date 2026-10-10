import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="w-full pb-12 pt-4">
      <div className="px-4 sm:px-8 lg:px-[55px]">
        <div className="relative overflow-hidden rounded-2xl bg-[#6B4423] shadow-lg">
          <div className="grid grid-cols-1 gap-6 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-2 md:items-center lg:px-16 lg:py-12">
            <div>
              <h2 className="mb-3 text-2xl font-serif text-white sm:text-3xl">
                Experience the Château Glow Difference
              </h2>
              <p className="text-sm leading-relaxed text-white/80 sm:text-base font-light">
                Visit any of our branches and discover why thousands trust us with their beauty journey. Premium service expectations met with genuine human care.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <Button asChild size="lg" className="h-12 rounded-full bg-white px-7 text-sm font-semibold text-[#6B4423] shadow-md transition hover:bg-stone-50">
                <Link href="/book">Book Your Appointment</Link>
              </Button>
              <Button asChild size="lg" className="h-12 rounded-full border border-white/40 bg-transparent px-7 text-sm font-medium text-white transition hover:border-white/70 hover:bg-white/10">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
