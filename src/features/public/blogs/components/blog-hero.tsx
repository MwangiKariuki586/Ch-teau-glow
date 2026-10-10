import Image from "next/image";

export function BlogHero() {
  return (
    <section className="relative w-full pb-20 pt-32">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&q=80"
          alt="Château Glow Blog"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#6B4423]/40 to-[#8B5A2B]/30" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative z-10 px-[55px]">
        <div className="max-w-2xl text-left">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            Beauty &amp; Wellness Insights
          </p>
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">
            The Château Glow Journal
          </h1>
          <p className="text-white max-w-2xl mx-auto font-light text-lg">
            Expert tips, treatment guides, and beauty inspiration from our specialists.
          </p>
        </div>
      </div>
    </section>
  );
}
