import { CustomerShellLayout } from "@/features/customer/shared/components/customer-shell-layout";
import { NotificationsProvider } from "@/features/shared/notifications/context/notifications-context";

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
