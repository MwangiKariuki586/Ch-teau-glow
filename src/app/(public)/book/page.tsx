import { redirect } from "next/navigation";
import { BookingFlow } from "@/features/public/booking";
import { getPromoContextFromSearchParams } from "@/features/public/shared/promo-context";

type SearchParams = Promise<{
  service?: string;
  offer?: string;
  code?: string;
  package?: string;
  waitlist_offer?: string;
  waitlist_offer_group?: string;
  waitlist_slot?: string;
  waitlist_notification?: string;
  branch_id?: string;
}>;

export default async function BookPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  if (!params.service && !params.waitlist_offer && !params.waitlist_offer_group) {
    redirect("/services");
  }

  return (
    <BookingFlow
      initialServiceSlug={params.service}
      initialWaitlistOfferId={params.waitlist_offer}
      initialWaitlistOfferGroupId={params.waitlist_offer_group}
      initialWaitlistSlotId={params.waitlist_slot}
      initialWaitlistNotificationId={params.waitlist_notification}
      initialBranchId={params.branch_id}
      promoContext={getPromoContextFromSearchParams(params)}
    />
  );
}
