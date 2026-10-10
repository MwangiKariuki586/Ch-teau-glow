import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanNotFound } from "@/features/public/plans/components";
import { getPlanBySlug } from "@/lib/plans/catalog";
import { getStripeServer } from "@/lib/stripe/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MembershipSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sessionId = readFirstParam(params.session_id);
  const fallbackPlanSlug = readFirstParam(params.plan);

  let verifiedPlanSlug = fallbackPlanSlug ?? null;
  let customerEmail: string | null = null;

  if (sessionId) {
    try {
      const stripe = getStripeServer();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      verifiedPlanSlug = session.metadata?.planSlug ?? verifiedPlanSlug;
      customerEmail = session.customer_details?.email ?? null;
    } catch (error) {
      console.error("Unable to verify membership checkout session:", error);
    }
  }

  const plan = verifiedPlanSlug ? getPlanBySlug(verifiedPlanSlug) : null;

  if (!plan) {
    return (
      <PlanNotFound
        title="Membership confirmed"
        message="Your checkout returned successfully, but we couldn't map it back to a plan summary."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF6F0] px-4 pb-24 pt-32 sm:px-[55px]">
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-[34px] border border-[#E8DED2] bg-white py-0 text-center shadow-[0_24px_80px_rgba(61,34,18,0.08)]">
          <CardContent className="px-8 py-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF8F0] text-[#3E6D4B]">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7660]">Membership active</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#2C1A12]">
              Thanks, you’re on {plan.name}.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#5E4C3E]">
              Your checkout completed through Stripe. Membership management tools are still being rolled out,
              but your plan is now active in Stripe as the current source of record.
            </p>
            {customerEmail ? (
              <p className="mt-3 text-sm text-[#8A7660]">Receipt email: {customerEmail}</p>
            ) : null}

            <div className="mt-8 rounded-[28px] bg-[#FCF8F2] p-6 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A7660]">What you get</p>
              <ul className="mt-4 space-y-3">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="text-sm leading-7 text-[#3A2A20]">
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="h-11 rounded-full bg-[#6B4423] px-6 text-white hover:bg-[#4A2C1A]"
              >
                <Link href={`/plans#${plan.slug}`}>Review membership</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-[#D8C6B4] bg-[#FFFDF9] text-[#6B4423] hover:bg-[#F7EFE5] hover:text-[#6B4423]"
              >
                <Link href="/plans">Back to plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
