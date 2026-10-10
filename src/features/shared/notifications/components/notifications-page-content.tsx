"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getNotificationCtaLabel,
  getNotificationPreviewText,
  getNotificationTargetHref,
  getWaitlistPreviewSlots,
} from "@/features/shared/notifications/lib/notification-utils";
import { useNotificationsContext } from "@/features/shared/notifications/context/notifications-context";
import { useRealtimeNotifications } from "@/features/shared/notifications/hooks/use-realtime-notifications";

function getPermissionLabel(
  permission: NotificationPermission | "unsupported",
) {
  if (permission === "granted") return "Desktop notifications enabled";
  if (permission === "denied") return "Desktop notifications blocked";
  if (permission === "unsupported") return "Desktop notifications unsupported";
  return "Enable desktop notifications";
}

type NotificationsPageContentProps = {
  basePath?: string;
};

export function NotificationsPageContent({
  basePath = "/notifications",
}: NotificationsPageContentProps) {
  const { loading, notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationsContext();

  // Desktop permission state is local — not needed in the shared context
  const { permission, requestDesktopPermission } = useRealtimeNotifications({
    maxItems: 50,
    basePath,
  });

  return (
    <section className="w-full">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unread: {unreadCount}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={permission !== "default"}
            onClick={() => void requestDesktopPermission()}
          >
            {getPermissionLabel(permission)}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl"
            disabled={unreadCount === 0}
            onClick={() => void markAllAsRead()}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {permission === "denied" && (
        <p className="mb-4 text-xs text-muted-foreground">
          Browser notifications are blocked. Enable them in your browser
          settings.
        </p>
      )}

      {loading ? (
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="py-6 text-sm text-muted-foreground">
            Loading notifications...
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="py-6 text-sm text-muted-foreground">
            You have no notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (!item.read_at) void markAsRead(item.id);
                window.location.href = `${basePath}/${item.id}`;
              }}
              className="block cursor-pointer"
            >
              <Card
                className={
                  !item.read_at
                    ? "rounded-2xl border-primary/25 bg-[#FFF8F0]/60 shadow-sm transition-shadow hover:shadow-md"
                    : "rounded-2xl border-border/60 shadow-sm transition-shadow hover:shadow-md"
                }
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {getNotificationPreviewText(item)}
                  </p>
                  {item.kind === "waitlist_slots_available" ? (
                    <div className="rounded-2xl bg-muted/40 p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Available times
                      </p>
                      <div className="space-y-2">
                        {getWaitlistPreviewSlots(item.payload)
                          .slice(0, 3)
                          .map((slot) => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-foreground">
                                {slot.startsAtLabel}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {slot.specialistName}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    <div
                      className="flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!item.read_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void markAsRead(item.id);
                          }}
                        >
                          Mark as read
                        </Button>
                      )}
                      {item.kind !== "waitlist_slots_available" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!item.read_at) void markAsRead(item.id);
                            window.location.href = getNotificationTargetHref(item, basePath);
                          }}
                        >
                          {getNotificationCtaLabel(
                            item.kind,
                            Boolean(item.link_url),
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
