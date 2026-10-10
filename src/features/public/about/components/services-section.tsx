import { Syringe, Sparkles, Award, Users, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';

export function ServicesSection() {
  const services = [
    {
      icon: <Syringe className="h-10 w-10" />,
      title: 'Medical Aesthetics & Injectables',
      description: 'Advanced medical procedures delivered by certified doctors for transformative results',
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80'
    },
    {
      icon: <Sparkles className="h-10 w-10" />,
      title: 'Advanced Facials & Skincare Laser',
      description: 'Cutting-edge facial treatments and laser therapies for radiant, healthy skin',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80'
    },
    {
      icon: <Award className="h-10 w-10" />,
      title: 'Semi-Permanent Makeup',
      description: 'Precision artistry for brows, lips, and lashes that enhance your natural beauty',
      image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80'
    },
    {
      icon: <Users className="h-10 w-10" />,
      title: 'Grooming & Beauty Services',
      description: 'Comprehensive grooming solutions for a polished, confident appearance',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80'
    },
    {
      icon: <ShoppingBag className="h-10 w-10" />,
      title: 'Retail Skincare & Beauty Products',
      description: 'Premium skincare and beauty products curated for optimal results',
      image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80'
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl md:text-4xl font-serif text-stone-900">Our Core Services</h2>
          <p className="mx-auto max-w-3xl text-lg text-stone-600 font-light">
            Comprehensive beauty and medical aesthetics solutions delivered by certified specialists
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 3).map((service, index) => (
            <Card key={index} className="group relative overflow-hidden p-0 rounded-2xl shadow-sm border border-stone-200 transition-all duration-300 hover:shadow-lg">
              <div className="relative h-48">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  {service.icon}
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-xl font-serif text-stone-900">{service.title}</h3>
                <p className="leading-relaxed text-stone-600 font-light">{service.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-6 grid max-w-5xl gap-6 md:grid-cols-2">
          {services.slice(3).map((service, index) => (
            <Card key={index} className="group relative overflow-hidden p-0 rounded-2xl shadow-sm border border-stone-200 transition-all duration-300 hover:shadow-lg">
              <div className="relative h-48">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  {service.icon}
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-xl font-serif text-stone-900">{service.title}</h3>
                <p className="leading-relaxed text-stone-600 font-light">{service.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
