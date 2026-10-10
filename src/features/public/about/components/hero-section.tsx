import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
      <Image
        src="https://browz.ae/cdn/shop/files/banneraboutbrowz.jpg?v=1732092931&width=1780"
        alt="Château Glow Clinic"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest">About Us</p>
          <h1 className="text-5xl md:text-6xl font-serif">
            UAE's #1 Beauty Brand
          </h1>
        </div>
      </div>
    </section>
  );
}
