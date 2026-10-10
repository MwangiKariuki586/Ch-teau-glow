"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  getNotificationPreviewText,
  getNotificationTargetHref,
  normalizeNotificationKind,
  normalizeNotificationPayload,
  type NotificationRow,
} from "@/features/shared/notifications/lib/notification-utils";
import { createClient } from "@/lib/supabase/client";

type NotificationPermissionState = NotificationPermission | "unsupported";

type UseRealtimeNotificationsOptions = {
  maxItems?: number;
  basePath?: string;
};

const DEFAULT_MAX_ITEMS = 8;
const DESKTOP_NOTIFICATION_THROTTLE_MS = 10_000;
const BROADCAST_CHANNEL_NAME = "browz-notifications";
const SHOWN_NOTIFICATION_TTL_MS = 60_000;
const SHOULD_LOG_REALTIME = true;

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getNotificationPermission(): NotificationPermissionState {
  if (!isBrowser() || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function isTabInactive() {
  if (!isBrowser()) return false;
  return document.visibilityState === "hidden" || !document.hasFocus();
}

function getRealtimeNotificationTargetHref(
  row: NotificationRow,
  basePath: string,
) {
  if (basePath === "/admin/notifications") {
    return `${basePath}/${encodeURIComponent(row.id)}`;
  }

  return getNotificationTargetHref(row, basePath);
}

function mapRealtimeRow(value: unknown, fallbackUserId?: string): NotificationRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const userIdValue = typeof row.user_id === "string" ? row.user_id : fallbackUserId ?? null;
  if (
    typeof row.id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.body !== "string" ||
    typeof row.created_at !== "string" ||
    !userIdValue
  ) {
    return null;
  }

  return {
    id: row.id,
    user_id: userIdValue,
    title: row.title,
    body: row.body,
    link_url: typeof row.link_url === "string" ? row.link_url : null,
    kind: normalizeNotificationKind(row.kind),
    payload: normalizeNotificationPayload(row.payload),
    created_at: row.created_at,
    read_at: typeof row.read_at === "string" ? row.read_at : null,
  };
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const basePath = options.basePath ?? "/notifications";
  const stableTabId = React.useId();
  const logRealtime = React.useCallback((message: string, meta?: Record<string, unknown>) => {
    if (!SHOULD_LOG_REALTIME || !isBrowser()) return;
    if (meta) {
      console.log(`[notifications] ${message}`, meta);
      return;
    }
    console.log(`[notifications] ${message}`);
  }, []);
  const warnRealtime = React.useCallback((message: string, meta?: Record<string, unknown>) => {
    if (!SHOULD_LOG_REALTIME || !isBrowser()) return;
    if (meta) {
      console.warn(`[notifications] ${message}`, meta);
      return;
    }
    console.warn(`[notifications] ${message}`);
  }, []);
  const supabase = React.useMemo(() => createClient(), []);
  const tabIdRef = React.useRef(`tab-${stableTabId}`);
  const broadcastRef = React.useRef<BroadcastChannel | null>(null);
  const seenShownIdsRef = React.useRef<Map<string, number>>(new Map());
  const pendingDesktopRowsRef = React.useRef<NotificationRow[]>([]);
  const flushTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushDesktopNotificationsRef = React.useRef<() => void>(() => {});
  const lastDesktopNotificationAtRef = React.useRef(0);
  const hiddenTitleCountRef = React.useRef(0);
  const originalTitleRef = React.useRef<string>("");

  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [permission, setPermission] = React.useState<NotificationPermissionState>(
    getNotificationPermission(),
  );

  const syncRealtimeAuth = React.useCallback(
    async (token: string | null) => {
      if (!token) return;

      try {
        await supabase.realtime.setAuth(token);
        logRealtime("Realtime auth synced");
      } catch (error) {
        console.error("[notifications] Failed to sync realtime auth", error);
      }
    },
    [logRealtime, supabase],
  );

  const resetHiddenTitleBadge = React.useCallback(() => {
    if (!isBrowser()) return;
    hiddenTitleCountRef.current = 0;
    if (originalTitleRef.current) {
      document.title = originalTitleRef.current;
    }
  }, []);

  const incrementHiddenTitleBadge = React.useCallback(() => {
    if (!isBrowser()) return;
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }

    hiddenTitleCountRef.current += 1;
    document.title = `(${hiddenTitleCountRef.current}) ${originalTitleRef.current}`;
  }, []);

  const pruneSeenShownIds = React.useCallback(() => {
    const now = Date.now();
    for (const [id, expiresAt] of seenShownIdsRef.current.entries()) {
      if (expiresAt <= now) {
        seenShownIdsRef.current.delete(id);
      }
    }
  }, []);

  const markIdsAsShown = React.useCallback((ids: string[]) => {
    const expiresAt = Date.now() + SHOWN_NOTIFICATION_TTL_MS;
    for (const id of ids) {
      seenShownIdsRef.current.set(id, expiresAt);
    }
  }, []);

  const broadcastShownIds = React.useCallback((ids: string[]) => {
    const channel = broadcastRef.current;
    if (!channel) return;
    channel.postMessage({
      type: "notification-shown",
      senderTabId: tabIdRef.current,
      ids,
      at: Date.now(),
    });
  }, []);

  const flushDesktopNotifications = React.useCallback(() => {
    if (!isBrowser()) return;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    if (permission !== "granted") {
      pendingDesktopRowsRef.current = [];
      return;
    }

    pruneSeenShownIds();

    const now = Date.now();
    const elapsed = now - lastDesktopNotificationAtRef.current;
    if (elapsed < DESKTOP_NOTIFICATION_THROTTLE_MS) {
      flushTimerRef.current = setTimeout(
        () => flushDesktopNotificationsRef.current(),
        DESKTOP_NOTIFICATION_THROTTLE_MS - elapsed,
      );
      return;
    }

    const uniqueRows = pendingDesktopRowsRef.current.filter(
      (row, index, rows) => rows.findIndex((candidate) => candidate.id === row.id) === index,
    );
    pendingDesktopRowsRef.current = [];

    const rowsToShow = uniqueRows.filter((row) => {
      const expiresAt = seenShownIdsRef.current.get(row.id);
      return !expiresAt || expiresAt <= Date.now();
    });

    if (rowsToShow.length === 0) return;

    const latestRow = rowsToShow[rowsToShow.length - 1];
    const single = rowsToShow.length === 1;
    const ids = rowsToShow.map((row) => row.id);
    const title = single ? latestRow.title : "New notifications";
    const body = single
      ? getNotificationPreviewText(latestRow)
      : `You have ${rowsToShow.length} new notifications`;
    const targetLink = single
      ? getRealtimeNotificationTargetHref(latestRow, basePath)
      : basePath;

    try {
      const desktopNotification = new Notification(title, {
        body,
        tag: single ? latestRow.id : `batch-${latestRow.id}`,
        data: {
          ids,
          link_url: targetLink,
        },
      });

      desktopNotification.onclick = () => {
        window.focus();
        window.location.href = targetLink;
      };

      lastDesktopNotificationAtRef.current = Date.now();
      markIdsAsShown(ids);
      broadcastShownIds(ids);
    } catch {
      // Browser can throw even when permission is "granted" in edge cases.
      for (const row of rowsToShow) {
        void row;
        incrementHiddenTitleBadge();
      }
    }
  }, [
    basePath,
    broadcastShownIds,
    incrementHiddenTitleBadge,
    markIdsAsShown,
    permission,
    pruneSeenShownIds,
  ]);

  React.useEffect(() => {
    flushDesktopNotificationsRef.current = flushDesktopNotifications;
  }, [flushDesktopNotifications]);

  const queueDesktopNotification = React.useCallback(
    (row: NotificationRow) => {
      pendingDesktopRowsRef.current = [
        ...pendingDesktopRowsRef.current.filter((item) => item.id !== row.id),
        row,
      ];
      void flushDesktopNotifications();
    },
    [flushDesktopNotifications],
  );

  const handleIncomingInsert = React.useCallback(
    (row: NotificationRow) => {
      logRealtime("INSERT event received", {
        id: row.id,
        user_id: row.user_id,
        read_at: row.read_at,
      });
      setNotifications((current) => [row, ...current.filter((item) => item.id !== row.id)].slice(0, maxItems));
      if (!row.read_at) {
        setUnreadCount((current) => current + 1);
      }

      const inactive = isTabInactive();
      if (!inactive) {
        toast(row.title, { description: getNotificationPreviewText(row) });
        return;
      }

      if (permission === "granted") {
        queueDesktopNotification(row);
        return;
      }

      incrementHiddenTitleBadge();
    },
    [
      incrementHiddenTitleBadge,
      logRealtime,
      maxItems,
      permission,
      queueDesktopNotification,
    ],
  );

  const refreshUnreadCount = React.useCallback(
    async (targetUserId: string | null) => {
      if (!targetUserId) {
        setUnreadCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", targetUserId)
        .is("read_at", null);

      if (!error && typeof count === "number") {
        setUnreadCount(count);
      }
    },
    [supabase],
  );

  const fetchNotifications = React.useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const [listResponse, unreadResponse] = await Promise.all([
      supabase
        .from("notifications")
        .select("id,user_id,title,body,link_url,kind,payload,created_at,read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(maxItems),
      supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId)
        .is("read_at", null),
    ]);

    if (!listResponse.error) {
      setNotifications((listResponse.data ?? []) as NotificationRow[]);
    } else {
      const fallbackListResponse = await supabase
        .from("notifications")
        .select("id,user_id,title,body,link_url,created_at,read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(maxItems);

      if (!fallbackListResponse.error) {
        setNotifications(
          ((fallbackListResponse.data ?? []) as Array<
            Omit<NotificationRow, "kind" | "payload">
          >).map((row) => ({
            ...row,
            kind: "generic",
            payload: {},
          })),
        );
      }
    }

    if (!unreadResponse.error && typeof unreadResponse.count === "number") {
      setUnreadCount(unreadResponse.count);
    } else if (!listResponse.error) {
      const fallbackUnread = ((listResponse.data ?? []) as NotificationRow[]).reduce(
        (count, item) => (item.read_at ? count : count + 1),
        0,
      );
      setUnreadCount(fallbackUnread);
    }
    setLoading(false);
  }, [maxItems, supabase, userId]);

  const markAsRead = React.useCallback(
    async (id: string) => {
      const target = notifications.find((item) => item.id === id);
      if (!target || target.read_at || !userId) return;

      logRealtime("Local markAsRead called", { id, userId });
      if (SHOULD_LOG_REALTIME && isBrowser()) {
        console.trace("[notifications] markAsRead trace", { id, userId });
      }

      const nowIso = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read_at: nowIso } : item)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: nowIso })
        .eq("id", id)
        .eq("user_id", userId)
        .is("read_at", null);

      if (error) {
        void fetchNotifications();
      } else {
        void refreshUnreadCount(userId);
      }
    },
    [fetchNotifications, logRealtime, notifications, refreshUnreadCount, supabase, userId],
  );

  const markAllAsRead = React.useCallback(async () => {
    if (!userId) return;
    if (unreadCount === 0) return;

    const nowIso = new Date().toISOString();
    const targetIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    logRealtime("Local markAllAsRead called", { count: targetIds.length, userId });
    if (SHOULD_LOG_REALTIME && isBrowser()) {
      console.trace("[notifications] markAllAsRead trace", { count: targetIds.length, userId });
    }

    setNotifications((current) =>
      current.map((item) => (item.read_at ? item : { ...item, read_at: nowIso })),
    );
    setUnreadCount(0);

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      void fetchNotifications();
    } else {
      void refreshUnreadCount(userId);
    }
  }, [
    fetchNotifications,
    logRealtime,
    notifications,
    refreshUnreadCount,
    supabase,
    unreadCount,
    userId,
  ]);

  const requestDesktopPermission = React.useCallback(async () => {
    if (!isBrowser() || !("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported" as const;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  React.useEffect(() => {
    if (!isBrowser()) return;
    originalTitleRef.current = document.title;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) {
        resetHiddenTitleBadge();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      resetHiddenTitleBadge();
    };
  }, [resetHiddenTitleBadge]);

  React.useEffect(() => {
    if (!isBrowser() || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastRef.current = channel;

    channel.onmessage = (event: MessageEvent<unknown>) => {
      const payload = event.data;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
      const message = payload as {
        type?: string;
        senderTabId?: string;
        ids?: unknown;
      };

      if (
        message.type !== "notification-shown" ||
        !Array.isArray(message.ids) ||
        message.senderTabId === tabIdRef.current
      ) {
        return;
      }

      const ids = message.ids.filter((id): id is string => typeof id === "string");
      if (ids.length === 0) return;
      markIdsAsShown(ids);
      pendingDesktopRowsRef.current = pendingDesktopRowsRef.current.filter(
        (row) => !ids.includes(row.id),
      );
    };

    return () => {
      channel.close();
      broadcastRef.current = null;
    };
  }, [markIdsAsShown]);

  React.useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let nextUserId = sessionData.session?.user?.id ?? null;
      const nextAccessToken = sessionData.session?.access_token ?? null;

      if (!nextUserId) {
        const { data } = await supabase.auth.getUser();
        nextUserId = data.user?.id ?? null;
      }

      if (nextAccessToken) {
        await syncRealtimeAuth(nextAccessToken);
      }

      if (!mounted) return;
      setUserId(nextUserId);
      setAccessToken(nextAccessToken);
      setLoading(false);
      setPermission(getNotificationPermission());
      logRealtime("Bootstrap completed", {
        userId: nextUserId,
        hasAccessToken: Boolean(nextAccessToken),
      });
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setAccessToken(session?.access_token ?? null);
      setPermission(getNotificationPermission());
      void syncRealtimeAuth(session?.access_token ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [logRealtime, supabase, syncRealtimeAuth]);

  React.useEffect(() => {
    setLoading(true);
    void fetchNotifications();
  }, [fetchNotifications]);

  React.useEffect(() => {
    if (!userId) return;
    logRealtime("Creating realtime channel", { userId });
    void syncRealtimeAuth(accessToken);

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          try {
            const row = mapRealtimeRow(payload.new, userId);
            if (!row) {
              warnRealtime("INSERT payload parse failed, refetching", {
                userId,
                payload: payload.new as Record<string, unknown>,
              });
              void fetchNotifications();
              return;
            }
            handleIncomingInsert(row);
            void refreshUnreadCount(userId);
          } catch (error) {
            console.error("[notifications] INSERT handler failed", error);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          try {
            const row = mapRealtimeRow(payload.new, userId);
            if (!row) {
              warnRealtime("UPDATE payload parse failed, refetching", {
                userId,
                payload: payload.new as Record<string, unknown>,
              });
              void fetchNotifications();
              return;
            }
            logRealtime("UPDATE event received", {
              id: row.id,
              user_id: row.user_id,
              read_at: row.read_at,
            });
            let unreadDelta = 0;
            setNotifications((current) => {
              const previous = current.find((item) => item.id === row.id);
              if (!previous) {
                return [row, ...current].slice(0, maxItems);
              }
              if (!previous.read_at && row.read_at) {
                unreadDelta -= 1;
              }
              if (previous.read_at && !row.read_at) unreadDelta += 1;
              return current.map((item) => (item.id === row.id ? row : item));
            });
            if (unreadDelta !== 0) {
              setUnreadCount((current) => Math.max(0, current + unreadDelta));
            }
            void refreshUnreadCount(userId);
          } catch (error) {
            console.error("[notifications] UPDATE handler failed", error);
          }
        },
      )
      .subscribe((status) => {
        logRealtime("Channel status changed", { status, userId });
        if (status === "SUBSCRIBED") {
          void refreshUnreadCount(userId);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          warnRealtime("Channel degraded, refetching notifications", { status, userId });
          void fetchNotifications();
        }
      });

    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingDesktopRowsRef.current = [];
      logRealtime("Removing channel subscription", { userId });
      void supabase.removeChannel(channel);
    };
  }, [
    fetchNotifications,
    handleIncomingInsert,
    logRealtime,
    maxItems,
    refreshUnreadCount,
    accessToken,
    syncRealtimeAuth,
    supabase,
    userId,
    warnRealtime,
  ]);

  React.useEffect(() => {
    if (userId) return;
    setNotifications([]);
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    pendingDesktopRowsRef.current = [];
  }, [userId]);

  return {
    loading,
    userId,
    notifications,
    unreadCount,
    permission,
    requestDesktopPermission,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
