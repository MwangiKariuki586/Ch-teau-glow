import { Card } from '@/components/ui/card';

export function PhilosophySection() {
  return (
    <section className="py-12 bg-[#F9F5F0]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <h2 className="mb-6 text-3xl md:text-4xl font-serif text-stone-900">Our Philosophy</h2>
          <p className="mb-8 text-xl font-light leading-relaxed text-stone-700 max-w-4xl mx-auto md:text-2xl">
            "Offer the best treatments, create a friendly environment, and deliver outstanding service by nurturing an elite team of superstars!"
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-2xl bg-white border border-stone-200 p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#6B4423]/10">
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="mb-3 text-xl font-serif text-stone-900">Best Treatments</h3>
            <p className="text-stone-600 font-light">Cutting-edge procedures delivered with clinical precision</p>
          </Card>
          <Card className="rounded-2xl bg-white border border-stone-200 p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#6B4423]/10">
              <span className="text-2xl">🤝</span>
            </div>
            <h3 className="mb-3 text-xl font-serif text-stone-900">Friendly Environment</h3>
            <p className="text-stone-600 font-light">Welcoming spaces where clients feel valued and comfortable</p>
          </Card>
          <Card className="rounded-2xl bg-white border border-stone-200 p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#6B4423]/10">
              <span className="text-2xl">⭐</span>
            </div>
            <h3 className="mb-3 text-xl font-serif text-stone-900">Elite Team</h3>
            <p className="text-stone-600 font-light">Certified specialists passionate about your beauty journey</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
