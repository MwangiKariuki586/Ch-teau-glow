import { Card } from '@/components/ui/card';

export function StatsSection() {
  const stats = [
    { number: '10+', label: 'Years of Excellence' },
    { number: '5', label: 'Branch Locations' },
    { number: '50+', label: 'Expert Specialists' },
    { number: '5000+', label: 'Happy Clients' }
  ];

  return (
    <section className="py-12 bg-[#F9F5F0]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12 text-center">
          <h2 className="mb-6 text-3xl md:text-4xl font-serif text-stone-900">What is Château Glow?</h2>
          <p className="mx-auto max-w-4xl text-lg leading-relaxed text-stone-600 font-light">
            A multi-branch beauty and aesthetics business operating across high client volume, premium service expectations, people-led delivery, and multi-location coordination.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border border-stone-200 bg-white p-6 text-center shadow-sm">
              <h3 className="mb-2 text-4xl font-bold text-[#6B4423]">{stat.number}</h3>
              <p className="font-medium text-stone-600">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
