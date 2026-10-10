import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServiceEditorPage } from "@/features/admin/services/components/service-editor-page";

type Params = Promise<{ id: string }>;

export default async function EditServicePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");

  // Use app_metadata.role for consistency with other auth checks
  if (user.app_metadata?.role !== "admin") {
    redirect("/");
  }

  return <ServiceEditorPage serviceId={id} />;
}
