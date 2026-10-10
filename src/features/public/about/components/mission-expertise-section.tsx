import Image from 'next/image';

export function MissionExpertiseSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-stone-500 mb-4">
            Beauty Artists
          </p>
          <h2 className="text-4xl md:text-5xl font-serif text-stone-900 mb-6">
            Your Natural Beauty, Our Inspiration
          </h2>
          <p className="max-w-4xl mx-auto text-lg text-stone-600 font-light leading-relaxed">
            Château Glow raises the beauty game, bringing innovation and personalisation to Semi Permanent Makeup, Brow Shaping, Lashes, Signature anti-aging facials and advanced skincare treatments.
          </p>
        </div>

        {/* Mission Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Left: Image */}
          <div className="relative h-[500px] rounded-2xl overflow-hidden">
            <Image
              src="https://browz.ae/cdn/shop/files/about1browz.jpg?v=1731499786&width=1500"
              alt="Château Glow Mission"
              fill
              className="object-cover"
            />
          </div>

          {/* Right: Content */}
          <div className="space-y-6">
            <h3 className="text-3xl font-serif text-stone-900">Mission</h3>
            <p className="text-lg text-stone-600 font-light leading-relaxed">
              Our philosophy is simple; offer the best treatments, create a friendly environment and deliver outstanding service by nurturing an elite team of superstars!
            </p>
          </div>
        </div>

        {/* Expertise Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Image */}
          <div className="relative h-[500px] rounded-2xl overflow-hidden">
            <Image
              src="https://browz.ae/cdn/shop/files/about2browz_15d1e26c-2e15-4c16-a63e-bc23346ba486.jpg?v=1732092875&width=1500"
              alt="Château Glow Expertise"
              fill
              className="object-cover"
            />
          </div>

          {/* Right: Content */}
          <div className="space-y-6">
            <h3 className="text-3xl font-serif text-stone-900">Expertise</h3>
            <p className="text-lg text-stone-600 font-light leading-relaxed">
              At Château Glow we pride ourselves in using cutting edge technology, to bring bespoke beauty excellence to the trend setters of Dubai and Abu Dhabi.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
