import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "How does billing work?",
    answer: "Memberships are billed monthly through Stripe Checkout. For now, plan management is handled manually by the Château Glow team while the self-serve member portal is being prepared.",
  },
  {
    question: "Can I cancel my membership?",
    answer: "Cancellation tooling is coming soon. Until then, members can contact Château Glow support for help with next-step changes and billing questions.",
  },
  {
    question: "How do I use my perks?",
    answer: "Perks are designed around the Château Glow journey as a whole. Depending on your plan, benefits may apply to bookings, consultations, products, aftercare, selected offers, or package access where membership perks are marked.",
  },
  {
    question: "Do unused monthly perks roll over?",
    answer: "No. Complimentary monthly benefits are designed to be used within the active billing month and reset with the next cycle.",
  },
  {
    question: "Is this only for services?",
    answer: "No. Membership is positioned across the wider Château Glow experience, including booking convenience, consultation access, selected product and aftercare savings, and earlier access to offers or packages.",
  },
];

export function PlansFaq() {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <Accordion type="single" collapsible className="px-6">
        {faqItems.map((item, index) => (
          <AccordionItem key={item.question} value={`item-${index}`}>
            <AccordionTrigger className="py-5 text-sm font-semibold hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
