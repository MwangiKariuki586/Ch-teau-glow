import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OffersModulePage } from "@/features/admin/offers";

export default async function AdminOffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  if (user.app_metadata?.role !== "admin") {
    redirect("/");
  }

  return <OffersModulePage />;
}
