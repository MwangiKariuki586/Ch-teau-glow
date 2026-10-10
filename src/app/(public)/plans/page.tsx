import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CompareTable, PlanCard, PlansFaq } from "@/features/public/plans/components";
import { plans } from "@/lib/plans/catalog";

export default function PlansPage() {
  return (
    <main className="min-h-screen bg-background pb-24 pt-32">
      <div className="px-4 sm:px-[55px] space-y-20">

        {/* Hero */}
        <section className="rounded-2xl border bg-muted/40 px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary/90">
              Château Glow Membership
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Membership designed for a smoother Château Glow journey.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Choose the tier that fits how you move through Château Glow. Each plan combines booking convenience,
              consultations, offers access, product value, and member communications into one calmer monthly rhythm.
            </p>
          </div>
        </section>

        {/* Plan cards */}
        <section>
          <div className="grid gap-6 xl:grid-cols-3">
            {plans.map((plan, index) => (
              <PlanCard key={plan.slug} plan={plan} featured={index === 1} />
            ))}
          </div>
        </section>

        <Separator />

        {/* Compare table */}
        <section>
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Compare plans</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">See how the tiers stack up.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              The core experience stays premium throughout. The difference is how much convenience, flexibility,
              and support you want wrapped around your monthly routine.
            </p>
          </div>
          <CompareTable />
        </section>

        <Separator />

        {/* FAQ */}
        <section>
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">A few practical details.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              This launch uses Stripe for live billing while member management is still being built out.
            </p>
          </div>
          <PlansFaq />
        </section>

      </div>
    </main>
  );
}
