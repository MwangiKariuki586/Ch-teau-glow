import { CustomerShellLayout } from "@/features/customer/shared/components/customer-shell-layout";
import { NotificationsProvider } from "@/features/shared/notifications/context/notifications-context";

// Shell queries Supabase during render — render on-demand so `next build`
// never executes Supabase code without env vars.
export const dynamic = "force-dynamic";

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerShellLayout>
      <NotificationsProvider maxItems={50} basePath="/notifications">
        {children}
      </NotificationsProvider>
    </CustomerShellLayout>
  );
}
