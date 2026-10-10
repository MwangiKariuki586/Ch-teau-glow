import { redirect } from "next/navigation";
import { ServiceEditorPage } from "@/features/admin/services/components/service-editor-page";
import { createClient } from "@/lib/supabase/server";

export default async function NewServicePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");

  // Use app_metadata.role for consistency with other auth checks
  if (user.app_metadata?.role !== "admin") {
    redirect("/");
  }

  return <ServiceEditorPage />;
}
