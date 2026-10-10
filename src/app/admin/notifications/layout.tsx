import { NotificationsProvider } from "@/features/shared/notifications/context/notifications-context";

export default function AdminNotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationsProvider maxItems={50} basePath="/admin/notifications">
      {children}
    </NotificationsProvider>
  );
}
