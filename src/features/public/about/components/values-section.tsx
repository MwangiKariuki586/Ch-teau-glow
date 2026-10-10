import { Target, CheckCircle, Heart, Shield, Zap, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function ValuesSection() {
  const coreValues = [
    {
      icon: <Target className="h-12 w-12" />,
      title: 'Precision',
      description: 'Every treatment is delivered with meticulous attention to detail and clinical precision, ensuring optimal results for our clients.'
    },
    {
      icon: <CheckCircle className="h-12 w-12" />,
      title: 'Consistency',
      description: 'Standardized excellence across all branches. Same high standards, same exceptional care, no matter which location you visit.'
    },
    {
      icon: <Heart className="h-12 w-12" />,
      title: 'Human Care',
      description: 'Technology supports us, but human connection defines us. We deliver warmth, empathy, and personalized attention in every interaction.'
    },
    {
      icon: <Shield className="h-12 w-12" />,
      title: 'Control & Safety',
      description: 'Rigorous protocols, certified specialists, and premium products ensure your safety and satisfaction are never compromised.'
    },
    {
      icon: <Zap className="h-12 w-12" />,
      title: 'Innovation',
      description: 'We embrace cutting-edge treatments and technologies while maintaining the human touch that makes beauty personal.'
    },
    {
      icon: <Users className="h-12 w-12" />,
      title: 'People-Led Delivery',
      description: 'Our elite team of superstars brings passion, expertise, and genuine care to every client journey.'
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl md:text-4xl font-serif text-stone-900">Our Core Values</h2>
          <p className="mx-auto max-w-3xl text-lg text-stone-600 font-light">
            The principles that guide every decision, every treatment, and every client interaction
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {coreValues.map((value, index) => (
            <Card
              key={index}
              className="group border border-stone-200 bg-white p-6 transition-all duration-300 hover:border-[#6B4423] hover:shadow-lg"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#6B4423]/10 text-[#6B4423] transition-all group-hover:bg-[#6B4423] group-hover:text-white">
                {value.icon}
              </div>
              <h3 className="mb-4 text-xl font-serif text-stone-900">{value.title}</h3>
              <p className="leading-relaxed text-stone-600 font-light">{value.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
