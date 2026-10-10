"use client";

import * as React from "react";
import { useRealtimeNotifications } from "@/features/shared/notifications/hooks/use-realtime-notifications";
import type { NotificationRow } from "@/features/shared/notifications/lib/notification-utils";

type NotificationsContextValue = {
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
};

const NotificationsContext =
  React.createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({
  children,
  maxItems = 50,
  basePath = "/notifications",
}: {
  children: React.ReactNode;
  maxItems?: number;
  basePath?: string;
}) {
  const value = useRealtimeNotifications({ maxItems, basePath });

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = React.useContext(NotificationsContext);
  // Graceful fallback — detail page can still work without the provider
  // (e.g. direct URL navigation) by returning empty state.
  if (!ctx) {
    return {
      notifications: [] as NotificationRow[],
      unreadCount: 0,
      loading: false,
      markAsRead: async (_id: string) => {},
      markAllAsRead: async () => {},
      refetch: async () => {},
    };
  }
  return ctx;
}
