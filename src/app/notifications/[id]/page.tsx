import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import {
  normalizeNotificationKind,
  normalizeNotificationPayload,
  type NotificationRow,
} from "@/features/shared/notifications/lib/notification-utils";
import { NotificationDetailContent } from "@/features/shared/notifications/components/notification-detail-content";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ failed_slot?: string }>;

export default async function NotificationDetailsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Fetch notification — try with full schema first, fall back if kind/payload
  // columns are missing on older deployments.
  let { data: notification, error } = await supabase
    .from("notifications")
    .select("id,user_id,title,body,link_url,kind,payload,created_at,read_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    const fallback = await supabase
      .from("notifications")
      .select("id,user_id,title,body,link_url,created_at,read_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    notification = fallback.data
      ? { ...fallback.data, kind: "generic", payload: {} }
      : null;
    error = fallback.error;
  }

  if (error || !notification) {
    notFound();
  }

  // Mark as read — fire-and-forget, don't await so it doesn't block render.
  if (!notification.read_at) {
    void supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id)
      .eq("user_id", user.id)
      .is("read_at", null);
  }

  const notificationRow: NotificationRow = {
    ...(notification as Omit<NotificationRow, "kind" | "payload"> & {
      kind: unknown;
      payload: unknown;
    }),
    kind: normalizeNotificationKind(notification.kind),
    payload: normalizeNotificationPayload(notification.payload),
  };

  return (
    <section className="w-full max-w-4xl">
      <Link
        href="/notifications"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to notifications
      </Link>

      <NotificationDetailContent
        notification={notificationRow}
        failedSlotId={query.failed_slot ?? null}
      />
    </section>
  );
}
