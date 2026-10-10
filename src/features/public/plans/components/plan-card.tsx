import Link from "next/link";
import { Bell, CalendarDays, Check, Gift, Headset, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/plans/catalog";

const categoryMeta = {
  booking:      { label: "Booking priority",       icon: CalendarDays },
  consultation: { label: "Consultation access",    icon: Sparkles     },
  shop:         { label: "Shop and aftercare",      icon: ShoppingBag  },
  offers:       { label: "Offers and packages",    icon: Gift         },
  support:      { label: "Support and updates",    icon: Headset      },
  loyalty:      { label: "Retention and loyalty",  icon: Bell         },
} as const;

export function PlanCard({ plan, featured = false }: { plan: Plan; featured?: boolean }) {
  const groupedBenefits = Object.entries(categoryMeta)
    .map(([category, meta]) => ({
      ...meta,
      category,
      benefits: plan.benefits.filter((b) => b.category === category),
    }))
    .filter((g) => g.benefits.length > 0);

  return (
    <Card
      id={plan.slug}
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none",
        featured && "border-primary/40 shadow-md",
      )}
    >
      {featured && (
        <div className="bg-primary px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-primary-foreground">
          Most Popular
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            {plan.badge && (
              <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                {plan.badge}
              </Badge>
            )}
            <h2 className="text-2xl font-semibold tracking-tight">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">{plan.tagline}</p>
          </div>
          <div className="shrink-0 rounded-lg border bg-muted px-4 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monthly</p>
            <p className="mt-0.5 text-base font-bold text-primary">{plan.priceLabel}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <p className="text-sm leading-7 text-muted-foreground">{plan.description}</p>

        {/* Highlights */}
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Why clients join
          </p>
          <ul className="space-y-2.5">
            {plan.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm leading-6">
                <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Benefit groups */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Membership across Château Glow
          </p>
          {groupedBenefits.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.category} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">{group.label}</p>
                </div>
                <div className="mt-3 space-y-3">
                  {group.benefits.map((b) => (
                    <div key={b.title}>
                      <p className="text-sm font-medium">{b.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{b.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fine print */}
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Good to know</p>
          </div>
          <ul className="mt-3 space-y-2">
            {plan.finePrint.map((item) => (
              <li key={item} className="rounded-md bg-background px-3 py-2 text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          asChild
          className={cn("w-full", featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "")}
          variant={featured ? "default" : "outline"}
        >
          <Link href={`/plans/${plan.slug}/checkout`}>Join now</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
