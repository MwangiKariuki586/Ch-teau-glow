import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PackagesModulePage } from "@/features/admin/packages";

export default async function AdminPackagesPage() {
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

  return <PackagesModulePage />;
}
