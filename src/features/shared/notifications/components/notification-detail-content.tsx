"use client";

import Link from "next/link";
import { format } from "date-fns";
import { BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getNotificationDetailSections,
  getNotificationCtaLabel,
  type NotificationRow,
} from "@/features/shared/notifications/lib/notification-utils";
import { WaitlistOfferSelector } from "@/features/shared/notifications/components/waitlist-offer-selector";
import { useNotificationsContext } from "@/features/shared/notifications/context/notifications-context";
import { buildOfferInitialData } from "@/features/shared/notifications/lib/build-offer-initial-data";

export function NotificationDetailContent({
  notification: serverNotification,
  failedSlotId,
}: {
  notification: NotificationRow;
  failedSlotId: string | null;
}) {
  // Prefer the in-memory version from context — it may have been updated
  // (e.g. read_at set) since the server rendered the page.
  const { notifications } = useNotificationsContext();
  const notification =
    notifications.find((n) => n.id === serverNotification.id) ??
    serverNotification;

  const detailSections =
    notification.kind === "waitlist_slots_available"
      ? []
      : getNotificationDetailSections(notification);

  const waitlistOfferGroupId =
    notification.kind === "waitlist_slots_available" &&
    typeof notification.payload.offer_group_id === "string"
      ? notification.payload.offer_group_id
      : null;

  // Build initial slot data from the notification payload so WaitlistOfferSelector
  // renders immediately without waiting for the API fetch. The selector will
  // silently revalidate in the background to get live status + full details.
  const initialOfferData = waitlistOfferGroupId
    ? buildOfferInitialData(notification.payload, notification.created_at)
    : null;

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">{notification.title}</CardTitle>
          </div>
          <Badge variant={notification.read_at ? "secondary" : "default"}>
            {notification.read_at ? "Read" : "Unread"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(notification.created_at), "PPP p")}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {notification.kind !== "waitlist_slots_available" ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {notification.body}
          </p>
        ) : null}

        {detailSections.length > 0 ? (
          <div className="grid gap-3">
            {detailSections.map((section) => (
              <div
                key={section.key}
                className="rounded-2xl border border-[#6B4423]/10 bg-[#FFF8F0] p-4"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {section.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {notification.kind === "waitlist_slots_available" ? (
          <WaitlistOfferSelector
            offerGroupId={waitlistOfferGroupId}
            linkUrl={notification.link_url}
            notificationId={notification.id}
            fallbackServiceName={
              typeof notification.payload.service_name === "string"
                ? notification.payload.service_name
                : null
            }
            fallbackBranchName={
              typeof notification.payload.branch_name === "string"
                ? notification.payload.branch_name
                : null
            }
            fallbackExpiresAt={
              typeof notification.payload.offer_expires_at === "string"
                ? notification.payload.offer_expires_at
                : null
            }
            failedSlotId={failedSlotId}
            initialData={initialOfferData}
          />
        ) : notification.link_url ? (
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-[#6B4423] text-white hover:bg-[#845632]"
          >
            <Link href={notification.link_url}>
              {getNotificationCtaLabel(notification.kind, true)}
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
