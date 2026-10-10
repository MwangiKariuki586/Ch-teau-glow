import Link from 'next/link';

export function ConsultationCTASection() {
  return (
    <section className="w-full bg-[#F0EDE8] py-24">
      <div className="flex flex-col items-center text-center px-6">
        <h2 className="font-serif text-5xl font-normal text-gray-900 leading-tight max-w-xl mb-6">
          Ready to elevate your beauty routine?
        </h2>
        <p className="text-gray-500 text-base max-w-md mb-10">
          Book your consultation today and let our experts design a personalized treatment plan just for you.
        </p>
        <Link
          href="/consultation"
          className="inline-flex items-center justify-center px-10 py-4 rounded-full bg-[#6B4423] text-white text-sm font-semibold hover:bg-[#4A2C1A] transition-colors"
        >
          Book for Consultation
        </Link>
      </div>
    </section>
  );
}
