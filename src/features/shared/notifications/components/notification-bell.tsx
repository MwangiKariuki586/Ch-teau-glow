"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getNotificationPreviewText,
  type NotificationRow,
} from "@/features/shared/notifications/lib/notification-utils";
import { useRealtimeNotifications } from "@/features/shared/notifications/hooks/use-realtime-notifications";
import { WaitlistSlotPickerDrawer } from "./waitlist-slot-picker-drawer";

function getPermissionLabel(
  permission: NotificationPermission | "unsupported",
) {
  if (permission === "granted") return "Desktop notifications enabled";
  if (permission === "denied") return "Desktop notifications blocked";
  if (permission === "unsupported") return "Desktop notifications unsupported";
  return "Enable desktop notifications";
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [attentionActive, setAttentionActive] = React.useState(false);
  const previousUnreadRef = React.useRef(0);
  const {
    loading,
    notifications,
    unreadCount,
    permission,
    requestDesktopPermission,
    markAsRead,
  } = useRealtimeNotifications({ maxItems: 8 });

  const [selectedWaitlistNotification, setSelectedWaitlistNotification] =
    React.useState<NotificationRow | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleNotificationClick = async (notification: NotificationRow) => {
    if (notification.kind === "waitlist_slots_available") {
      // Mark as read
      if (!notification.read_at) {
        void markAsRead(notification.id);
      }

      // Close dropdown
      setOpen(false);

      // Open drawer with notification data
      setSelectedWaitlistNotification(notification);
      setDrawerOpen(true);
    } else {
      // For non-waitlist notifications, navigate normally
      if (!notification.read_at) {
        void markAsRead(notification.id);
      }
      router.push(`/notifications/${notification.id}`);
      setOpen(false);
    }
  };

  React.useEffect(() => {
    const previousUnread = previousUnreadRef.current;
    if (unreadCount > previousUnread) {
      setAttentionActive(true);
      const timeoutId = setTimeout(() => {
        setAttentionActive(false);
      }, 1800);
      previousUnreadRef.current = unreadCount;
      return () => clearTimeout(timeoutId);
    }
    previousUnreadRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-full transition-transform",
            attentionActive && "animate-bounce",
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground",
                attentionActive && "animate-pulse",
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-2" />
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="space-y-1 px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full justify-start text-xs"
            disabled={permission !== "default"}
            onClick={() => {
              void requestDesktopPermission();
            }}
          >
            {getPermissionLabel(permission)}
          </Button>
          {permission === "denied" && (
            <p className="text-[11px] text-muted-foreground">
              Allow browser notifications in your browser settings, then reload
              this tab.
            </p>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              Loading notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            notifications.map((item) => {
              const content = (
                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">
                      {item.title}
                    </p>
                    {!item.read_at && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {getNotificationPreviewText(item)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              );

              return (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(
                    "block cursor-pointer rounded-none px-3 py-3",
                    !item.read_at && "bg-muted/30",
                  )}
                  onClick={() => handleNotificationClick(item)}
                >
                  <div>{content}</div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="px-3 py-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start text-xs"
          >
            <Link href="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
      {selectedWaitlistNotification && (
        <WaitlistSlotPickerDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          notificationId={selectedWaitlistNotification.id}
          serviceName={
            typeof selectedWaitlistNotification.payload.service_name ===
            "string"
              ? selectedWaitlistNotification.payload.service_name
              : "Service"
          }
          branchName={
            typeof selectedWaitlistNotification.payload.branch_name === "string"
              ? selectedWaitlistNotification.payload.branch_name
              : "Branch"
          }
          offerGroupId={
            typeof selectedWaitlistNotification.payload.offer_group_id ===
            "string"
              ? selectedWaitlistNotification.payload.offer_group_id
              : null
          }
          linkUrl={selectedWaitlistNotification.link_url}
          expiresAt={
            typeof selectedWaitlistNotification.payload.offer_expires_at ===
            "string"
              ? selectedWaitlistNotification.payload.offer_expires_at
              : null
          }
        />
      )}
    </DropdownMenu>
  );
}
