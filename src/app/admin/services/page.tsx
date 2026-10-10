import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServicesSplitView } from "@/features/admin/services";

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");
  if (user.app_metadata?.role !== "admin") redirect("/");

  return <ServicesSplitView />;
}
