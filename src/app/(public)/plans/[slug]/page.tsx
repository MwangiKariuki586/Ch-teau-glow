import { redirect } from "next/navigation";
import { getPlanBySlug } from "@/lib/plans/catalog";

type Params = Promise<{ slug: string }>;

export default async function PlanDetailsRedirectPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const plan = getPlanBySlug(slug);

  if (!plan) {
    redirect("/plans");
  }

  redirect(`/plans#${plan.slug}`);
}
