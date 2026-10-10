import { createClient } from "@/lib/supabase/server";
import { CartPage } from "@/features/public/shop/components/cart-page";

export default async function PublicCartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const customerName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  // Pre-select the customer's home branch for pickup if available
  let defaultBranchId: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("branch_id")
      .eq("user_id", user.id)
      .single();
    defaultBranchId = profile?.branch_id ?? undefined;
  }

  return (
    <CartPage
      isAuthenticated={Boolean(user)}
      customerName={customerName}
      customerEmail={user?.email ?? ""}
      defaultBranchId={defaultBranchId}
    />
  );
}
