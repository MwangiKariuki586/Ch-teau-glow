"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, Clock, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getNotificationPreviewText,
  getNotificationTargetHref,
  getWaitlistPreviewSlots,
  type NotificationRow,
} from "@/features/shared/notifications/lib/notification-utils";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  notifications: NotificationRow[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  basePath?: string;
}

export function NotificationPanel({
  isOpen,
  onClose,
  loading,
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  basePath = "/admin/notifications",
}: NotificationPanelProps) {
  const router = useRouter();
  const buildTargetHref = (notification: NotificationRow) =>
    getNotificationTargetHref(notification, basePath);
  const buildDetailHref = (notification: NotificationRow) =>
    `${basePath}/${encodeURIComponent(notification.id)}`;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-96 transform border-l border-border/20 bg-background/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/20 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Bell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-xl transition-colors hover:bg-muted/60"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between border-b border-border/10 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void markAllAsRead();
            }}
            disabled={unreadCount === 0}
            className="text-primary transition-colors hover:bg-primary/10 hover:text-primary"
          >
            Mark all as read
          </Button>
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            {notifications.length} total
          </Badge>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)] flex-1">
          <div className="p-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-foreground">Loading notifications</h3>
                <p className="text-sm text-muted-foreground">Fetching your latest updates.</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-foreground">No notifications</h3>
                <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group relative rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
                      notification.read_at
                        ? "border-border/20 bg-background hover:bg-muted/30"
                        : "cursor-pointer border-primary/20 bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10"
                    }`}
                    onClick={() => {
                      if (!notification.read_at) {
                        void markAsRead(notification.id);
                      }
                      router.push(buildDetailHref(notification));
                      onClose();
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <Bell className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-medium leading-tight ${
                              notification.read_at ? "text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {notification.title}
                          </h4>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {!notification.read_at && (
                                <DropdownMenuItem
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void markAsRead(notification.id);
                                  }}
                                >
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link href={buildDetailHref(notification)} onClick={onClose}>
                                  {notification.kind === "waitlist_slots_available"
                                    ? "Choose a slot"
                                    : "Open details"}
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p
                          className={`mt-1 text-xs leading-relaxed ${
                            notification.read_at ? "text-muted-foreground/80" : "text-muted-foreground"
                          }`}
                        >
                          {getNotificationPreviewText(notification)}
                        </p>
                        {notification.kind === "waitlist_slots_available" ? (
                          <div className="mt-3 space-y-2">
                            {getWaitlistPreviewSlots(notification.payload)
                              .slice(0, 3)
                              .map((slot) => (
                                <div
                                  key={slot.id}
                                  className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 text-[11px]"
                                >
                                  <span className="font-medium text-foreground">
                                    {slot.startsAtLabel}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {slot.specialistName}
                                  </span>
                                </div>
                              ))}
                          </div>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground/60" />
                          <span className="text-xs text-muted-foreground/80">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          {!notification.read_at && (
                            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/10 px-3 py-2">
          <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start text-xs">
            <Link href={basePath} onClick={onClose}>
              View all notifications
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
