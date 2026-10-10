import { redirect } from "next/navigation";
import { NotificationsPageContent } from "@/features/shared/notifications/components/notifications-page-content";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return <NotificationsPageContent />;
}
