import Image from 'next/image';

export function FounderSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Image */}
          <div className="relative h-[600px] rounded-2xl overflow-hidden">
            <Image
              src="https://browz.ae/cdn/shop/files/KoQAkGsK-br3-scaled.jpg?v=1731567657"
              alt="Michele Barclay - Founder"
              fill
              className="object-cover"
            />
          </div>

          {/* Right: Content */}
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-stone-500">
              The Founder
            </p>
            <h2 className="text-4xl md:text-5xl font-serif text-stone-900">
              Michele Barclay
            </h2>
            <div className="space-y-4 text-stone-600 font-light leading-relaxed">
              <p>
                Château Glow was founded in 2016 by internationally recognized creative artist, Michele Barclay.
              </p>
              <p>
                Passionate about bringing together an award winning team of diverse professionals, Michele continues to invest in advanced training for her team of Artists while traveling the world to attend various seminars and training courses for further development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
