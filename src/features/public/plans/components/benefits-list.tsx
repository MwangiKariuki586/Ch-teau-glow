import {
  CalendarDays,
  Cake,
  Gift,
  Headset,
  Percent,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Plan } from "@/lib/plans/catalog";

const benefitIcons: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  cake: Cake,
  gift: Gift,
  headset: Headset,
  percent: Percent,
  sparkles: Sparkles,
};

export function BenefitsList({ benefits }: { benefits: Plan["benefits"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {benefits.map((benefit) => {
        const Icon = benefit.icon ? benefitIcons[benefit.icon] ?? Sparkles : Sparkles;

        return (
          <Card
            key={benefit.title}
            className="rounded-[24px] border border-[#EADFD3] bg-white/90 py-0 shadow-[0_14px_40px_rgba(61,34,18,0.06)]"
          >
            <CardContent className="flex gap-4 px-5 py-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3E7DB] text-[#6B4423]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#2C1A12]">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6B5A4D]">{benefit.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
