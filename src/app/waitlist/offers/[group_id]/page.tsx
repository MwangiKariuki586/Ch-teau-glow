import { redirect } from "next/navigation";
import { FavoritesProvider } from "@/features/customer/favorites/context/favorites-context";
import { WaitlistOfferGroupPage } from "@/features/customer/waitlists/components/waitlist-offer-group-page";
import { CustomerShellLayout } from "@/features/customer/shared/components/customer-shell-layout";
import { createClient } from "@/lib/supabase/server";
import { getWaitlistOfferGroupForUser } from "@/lib/waitlist/server";
import { AuthProvider } from "@/lib/auth/context";

type SearchParams = Promise<{
  failed_slot?: string;
}>;

export default async function WaitlistOfferGroupRoute({
  params,
  searchParams,
}: {
  params: Promise<{ group_id: string }>;
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { group_id } = await params;
  const query = await searchParams;

  let details;
  try {
    details = await getWaitlistOfferGroupForUser({
      userId: user.id,
      groupId: group_id,
    });
  } catch {
    redirect("/customer/waitlists");
  }

  return (
    <AuthProvider>
      <FavoritesProvider>
        <CustomerShellLayout>
          <WaitlistOfferGroupPage
            details={details}
            failedSlotId={query.failed_slot ?? null}
          />
        </CustomerShellLayout>
      </FavoritesProvider>
    </AuthProvider>
  );
}
