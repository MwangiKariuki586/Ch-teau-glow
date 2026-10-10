'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { landingApi, type FAQ } from '../api';

export function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFAQs() {
      try {
        const data = await landingApi.getFAQs(5);
        setFaqs(data);
      } catch (error) {
        console.error('Failed to load FAQs:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFAQs();
  }, []);

  if (isLoading) {
    return (
      <section className="w-full bg-white py-16">
        <div className="px-13.75 animate-pulse">
          <div className="h-10 w-64 bg-gray-200 mx-auto mb-12 rounded" />
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl" />
              ))}
            </div>
            <div className="h-64 bg-[#6B4423]/20 rounded-3xl" />
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) return null;

  return (
    <section className="w-full bg-white py-16">
      <div className="px-13.75">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold">
            Question? <span className="text-[#c9a961]">Look here.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Everything you need to know about our services features.</p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={faq.id} 
                value={`item-${index}`}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 data-[state=open]:bg-[#6B4423] data-[state=open]:text-white data-[state=open]:border-[#6B4423] transition-colors border-b!"
              >
                <AccordionTrigger className="px-6 py-4 text-left font-semibold hover:no-underline data-[state=open]:text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 text-gray-150 data-[state=open]:text-gray-200">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <Card className="flex h-fit flex-col items-center justify-center rounded-3xl bg-[#6B4423] p-8 text-center text-white">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#c9a961] text-3xl">
              💬
            </div>
            <h3 className="mb-4 text-2xl font-bold">You have different questions?</h3>
            <p className="mb-6 text-gray-200">
              Our team will answer all your questions. We ensure a quick response.
            </p>
            <Button asChild size="lg" variant="secondary" className="rounded-full bg-white text-[#6B4423] hover:bg-gray-100">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
