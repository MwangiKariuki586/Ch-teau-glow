import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MembershipCheckout } from "@/features/public/membership/components/MembershipCheckout";
import { PLAN_CATALOG, isPlanTier } from "@/lib/plans/catalog";

export default async function MembershipCheckoutPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to signin with return URL
    redirect(`/auth/signin?redirect=/membership/${tier}/checkout`);
  }

  // Validate tier
  if (!isPlanTier(tier)) {
    redirect("/offers");
  }

  const plan = PLAN_CATALOG[tier];

  return (
    <main className="min-h-screen bg-[#FAF6F0] pb-24 pt-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <MembershipCheckout plan={plan} user={user} />
      </div>
    </main>
  );
}
