import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MembershipCheckoutPanel, PlanNotFound } from "@/features/public/plans/components";
import { getPlanBySlug } from "@/lib/plans/catalog";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

export default async function PlanCheckoutPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const plan = getPlanBySlug(slug);

  if (!plan) {
    return (
      <PlanNotFound
        title="Checkout unavailable"
        message="We couldn't find the membership tier you were trying to purchase."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#FAF6F0] pb-24 pt-32">
      <section className="px-4 sm:px-[55px]">
        <div className="mb-8">
          <Link
            href={`/plans#${plan.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6B4423] transition-colors hover:text-[#4A2C1A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {plan.name}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-8">
          <Card className="rounded-[30px] border border-[#E8DED2] bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe5_100%)] py-0 shadow-[0_20px_70px_rgba(61,34,18,0.08)]">
            <CardContent className="px-6 py-6">
              <div className="flex items-center justify-between gap-3">
                <Badge className="rounded-full bg-[#6B4423] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-[#6B4423]">
                  {plan.badge ?? "Membership"}
                </Badge>
                <span className="text-sm font-medium text-[#6B4423]">{plan.priceLabel}</span>
              </div>
              <h1 className="mt-5 text-3xl font-semibold text-[#2C1A12]">{plan.name}</h1>
              <p className="mt-3 text-sm leading-7 text-[#5E4C3E]">{plan.description}</p>
              <div className="mt-6 space-y-3">
                {plan.highlights.map((highlight) => (
                  <div key={highlight} className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-[#3A2A20]">
                    {highlight}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <MembershipCheckoutPanel plan={plan} initialEmail={user?.email ?? ""} />
            <Card className="rounded-[28px] border border-[#E8DED2] bg-white py-0 shadow-[0_16px_50px_rgba(61,34,18,0.06)]">
              <CardContent className="flex gap-4 px-6 py-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3E7DB] text-[#6B4423]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#2C1A12]">Before you continue</h2>
                  <p className="mt-2 text-sm leading-6 text-[#6B5A4D]">
                    This launch uses Stripe as the system of record for membership billing. Member dashboards,
                    plan management, and saved benefits history are still coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
