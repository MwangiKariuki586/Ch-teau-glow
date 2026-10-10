import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon, BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getNotificationCtaLabel,
  getNotificationDetailSections,
  normalizeNotificationKind,
  normalizeNotificationPayload,
  type NotificationRow,
} from "@/features/shared/notifications/lib/notification-utils";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export default async function AdminNotificationDetailsPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

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
      ? {
          ...fallback.data,
          kind: "generic",
          payload: {},
        }
      : null;
    error = fallback.error;
  }

  if (error || !notification) {
    notFound();
  }

  const notificationRow = {
    ...(notification as Omit<NotificationRow, "kind" | "payload"> & {
      kind: unknown;
      payload: unknown;
    }),
    kind: normalizeNotificationKind(notification.kind),
    payload: normalizeNotificationPayload(notification.payload),
  } satisfies NotificationRow;

  const detailSections = getNotificationDetailSections(notificationRow);

  if (!notificationRow.read_at) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationRow.id)
      .eq("user_id", user.id)
      .is("read_at", null);
  }

  return (
    <section className="w-full max-w-4xl">
      <Link
        href="/admin/notifications"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to notifications
      </Link>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">{notificationRow.title}</CardTitle>
            </div>
            <Badge variant={notificationRow.read_at ? "secondary" : "default"}>
              {notificationRow.read_at ? "Read" : "Unread"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(notificationRow.created_at), "PPP p")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {notificationRow.body}
          </p>
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
          {notificationRow.link_url && (
            <Button asChild size="sm" className="rounded-xl bg-[#6B4423] text-white hover:bg-[#845632]">
              <Link href={notificationRow.link_url}>
                {getNotificationCtaLabel(notificationRow.kind, true)}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
