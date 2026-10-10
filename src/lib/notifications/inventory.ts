import "server-only";

import { formatDistanceToNowStrict } from "date-fns";
import { resolveAdminRecipients } from "@/lib/notifications/admin";
import { insertNotificationWithFallback } from "@/lib/notifications/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

type InventoryNotificationEvent =
  | "item.created"
  | "stock.low"
  | "stock.out"
  | "transfer.sent"
  | "transfer.received"
  | "transfer.overdue"
  | "reconciliation.applied"
  | "reconciliation.large_variance"
  | "expiry.expiring_soon"
  | "expiry.expired"
  | "expiry.disposed";

type StockThresholdTransitionPayload = {
  branchId: string;
  inventoryItemId: string;
  previousOnHand: number;
  currentOnHand: number;
};

type NotificationEnvelope = {
  title: string;
  body: string;
  linkUrl: string;
  dedupeKey: string;
  kind:
    | "inventory_low_stock"
    | "inventory_out_of_stock"
    | "inventory_transfer_sent"
    | "inventory_transfer_received"
    | "inventory_transfer_overdue"
    | "inventory_reconciliation_applied"
    | "inventory_large_variance"
    | "inventory_expiring_soon"
    | "inventory_expired_stock"
    | "inventory_expired_stock_disposed"
    | "inventory_asset_created";
  payload: Record<string, unknown>;
};

type TransferRow = {
  id: string;
  status: string;
  from_branch_id: string;
  to_branch_id: string;
  sent_at: string | null;
  received_at: string | null;
  from_branch: { id: string; name: string | null; city: string | null } | null;
  to_branch: { id: string; name: string | null; city: string | null } | null;
  inventory_transfer_items: Array<{ inventory_item_id: string; quantity: number }> | null;
};

type ReconciliationRow = {
  id: string;
  branch_id: string;
  status: string;
  applied_at: string | null;
  branches: { id: string; name: string | null; city: string | null } | null;
  inventory_reconciliation_lines:
    | Array<{
        inventory_item_id: string;
        system_qty: number;
        counted_qty: number;
        delta_qty: number;
      }>
    | null;
};

type BatchRow = {
  id: string;
  branch_id: string;
  inventory_item_id: string;
  quantity: number;
  expires_at: string | null;
  lot_number: string | null;
  branches: { id: string; name: string | null; city: string | null } | null;
  inventory_items:
    | { id: string; name: string | null; sku: string | null; unit: string | null }
    | null;
};

type InventoryItemRow = {
  id: string;
  name: string | null;
  sku: string | null;
  item_type: string | null;
  branch_inventory:
    | Array<{
        branch_id: string;
        branches: { id: string; name: string | null; city: string | null } | null;
      }>
    | null;
};

const DEFAULT_TRANSFER_OVERDUE_HOURS = 48;
const DEFAULT_EXPIRY_SOON_DAYS = 30;
const DEFAULT_LARGE_VARIANCE_THRESHOLD = 10;

function toNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getTodayBucket() {
  return new Date().toISOString().slice(0, 10);
}

function getTransferOverdueHours() {
  return Math.max(
    1,
    Number.parseInt(process.env.INVENTORY_TRANSFER_OVERDUE_HOURS ?? "", 10) ||
      DEFAULT_TRANSFER_OVERDUE_HOURS,
  );
}

function getExpirySoonDays() {
  return Math.max(
    1,
    Number.parseInt(process.env.INVENTORY_EXPIRY_SOON_DAYS ?? "", 10) ||
      DEFAULT_EXPIRY_SOON_DAYS,
  );
}

function getLargeVarianceThreshold() {
  return Math.max(
    1,
    Number.parseFloat(process.env.INVENTORY_LARGE_VARIANCE_THRESHOLD ?? "") ||
      DEFAULT_LARGE_VARIANCE_THRESHOLD,
  );
}

function isExpiryNotificationsEnabled() {
  const raw = process.env.INVENTORY_EXPIRY_NOTIFICATIONS_ENABLED;
  if (!raw) return true;
  return raw === "1" || raw.toLowerCase() === "true";
}

function buildLowStockLink(branchId: string) {
  return `/admin/inventory/low-stock?branch=${encodeURIComponent(branchId)}`;
}

function buildItemLink(itemId: string) {
  return `/admin/inventory/items/${itemId}`;
}

function buildTransferLink(params: {
  tab: "in-transit" | "received";
  transferId?: string;
  overdue?: boolean;
}) {
  const search = new URLSearchParams({ tab: params.tab });
  if (params.transferId) search.set("transfer", params.transferId);
  if (params.overdue) search.set("overdue", "1");
  return `/admin/inventory/transfers?${search.toString()}`;
}

function buildReconciliationLink(reconciliationId: string) {
  return `/admin/inventory/reconciliation?recon=${encodeURIComponent(reconciliationId)}`;
}

function buildExpiryLink(tab: "expiring-soon" | "expired") {
  return `/admin/inventory/expiry?tab=${encodeURIComponent(tab)}`;
}

function toDateOnlyValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getExpiryEventForBatch(params: {
  quantity: number;
  expiresAt: string | null;
  today?: Date;
}) {
  if (params.quantity <= 0 || !params.expiresAt) {
    return null;
  }

  const today = params.today ?? new Date();
  const todayValue = toDateOnlyValue(today);
  const soonCutoffValue = toDateOnlyValue(
    new Date(today.getTime() + getExpirySoonDays() * 24 * 60 * 60 * 1000),
  );

  if (params.expiresAt < todayValue) {
    return "expiry.expired" as const;
  }

  if (params.expiresAt <= soonCutoffValue) {
    return "expiry.expiring_soon" as const;
  }

  return null;
}

async function sendInventoryNotification(params: {
  supabase: ServiceClient;
  actorUserId?: string | null;
  envelope: NotificationEnvelope;
}) {
  const recipients = await resolveAdminRecipients(params.supabase, params.actorUserId ?? null);
  if (recipients.length === 0) {
    return 0;
  }

  const results = await Promise.all(
    recipients.map((recipientUserId) =>
      insertNotificationWithFallback({
        supabase: params.supabase,
        userId: recipientUserId,
        kind: params.envelope.kind,
        title: params.envelope.title,
        body: params.envelope.body,
        linkUrl: params.envelope.linkUrl,
        dedupeKey: `${params.envelope.dedupeKey}:to:${recipientUserId}`,
        payload: {
          ...params.envelope.payload,
          inventory_scope: "inventory",
          admin_recipient_user_id: recipientUserId,
        },
      }),
    ),
  );

  return results.some(Boolean);
}

async function buildStockLevelEnvelope(
  supabase: ServiceClient,
  event: "stock.low" | "stock.out",
  payload: {
    branchId: string;
    inventoryItemId: string;
    currentOnHand: number;
  },
): Promise<NotificationEnvelope | null> {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select(
      "branch_id, inventory_item_id, on_hand, low_stock_threshold, branches(id,name,city), inventory_items(id,name,sku,unit)",
    )
    .eq("branch_id", payload.branchId)
    .eq("inventory_item_id", payload.inventoryItemId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[inventoryNotifications] Failed to load stock context:", error);
    }
    return null;
  }

  const branch = Array.isArray(data.branches) ? data.branches[0] : data.branches;
  const item = Array.isArray(data.inventory_items) ? data.inventory_items[0] : data.inventory_items;
  const branchName = branch?.name ?? "Unknown branch";
  const itemName = item?.name ?? "Inventory item";
  const quantity = toNumber(data.on_hand);
  const threshold = toNumber(data.low_stock_threshold);

  if (event === "stock.low") {
    return {
      title: "Low stock",
      body: `${itemName} is low at ${branchName} (qty: ${quantity}).`,
      linkUrl: buildLowStockLink(payload.branchId),
      dedupeKey: `inv:low:${payload.branchId}:${payload.inventoryItemId}:${getTodayBucket()}`,
      kind: "inventory_low_stock",
      payload: {
        inventory_event: event,
        branch_id: payload.branchId,
        branch_name: branchName,
        item_id: payload.inventoryItemId,
        item_name: itemName,
        quantity,
        threshold,
      },
    };
  }

  return {
    title: "Out of stock",
    body: `${itemName} is out of stock at ${branchName}.`,
    linkUrl: buildItemLink(payload.inventoryItemId),
    dedupeKey: `inv:oos:${payload.branchId}:${payload.inventoryItemId}:${getTodayBucket()}`,
    kind: "inventory_out_of_stock",
    payload: {
      inventory_event: event,
      branch_id: payload.branchId,
      branch_name: branchName,
      item_id: payload.inventoryItemId,
      item_name: itemName,
      quantity,
      threshold,
    },
  };
}

async function buildItemCreatedEnvelope(
  supabase: ServiceClient,
  inventoryItemId: string,
): Promise<NotificationEnvelope | null> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      "id,name,sku,item_type,branch_inventory(branch_id,branches(id,name,city))",
    )
    .eq("id", inventoryItemId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[inventoryNotifications] Failed to load item context:", error);
    }
    return null;
  }

  const item = data as unknown as InventoryItemRow;
  const branchInventory = item.branch_inventory?.[0] ?? null;
  const branch = branchInventory?.branches ?? null;
  const itemName = item.name ?? "Inventory asset";
  const branchName = branch?.name ?? "selected branch";
  const itemType = item.item_type === "retail_product" ? "Retail product" : "Consumable";

  return {
    title: `${itemType} asset created`,
    body: `${itemName} was added to ${branchName}.`,
    linkUrl: buildItemLink(inventoryItemId),
    dedupeKey: `inv:item:${inventoryItemId}:created`,
    kind: "inventory_asset_created",
    payload: {
      inventory_event: "item.created",
      item_id: inventoryItemId,
      item_name: itemName,
      item_type: itemType,
      sku: item.sku,
      branch_id: branchInventory?.branch_id ?? null,
      branch_name: branchName,
    },
  };
}

async function buildTransferEnvelope(
  supabase: ServiceClient,
  event: "transfer.sent" | "transfer.received" | "transfer.overdue",
  transferId: string,
): Promise<NotificationEnvelope | null> {
  const { data, error } = await supabase
    .from("inventory_transfers")
    .select(
      "id,status,from_branch_id,to_branch_id,sent_at,received_at,from_branch:branches!inventory_transfers_from_branch_id_fkey(id,name,city),to_branch:branches!inventory_transfers_to_branch_id_fkey(id,name,city),inventory_transfer_items(inventory_item_id,quantity)",
    )
    .eq("id", transferId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[inventoryNotifications] Failed to load transfer context:", error);
    }
    return null;
  }

  const transfer = data as unknown as TransferRow;
  const fromBranchName = transfer.from_branch?.name ?? "Unknown branch";
  const toBranchName = transfer.to_branch?.name ?? "Unknown branch";
  const itemsCount = (transfer.inventory_transfer_items ?? []).length;

  if (event === "transfer.sent") {
    return {
      title: "Transfer sent",
      body: `Stock transfer sent from ${fromBranchName} to ${toBranchName} (${itemsCount} items).`,
      linkUrl: buildTransferLink({ tab: "in-transit", transferId }),
      dedupeKey: `inv:transfer:${transferId}:sent`,
      kind: "inventory_transfer_sent",
      payload: {
        inventory_event: event,
        transfer_id: transferId,
        from_branch_id: transfer.from_branch_id,
        from_branch_name: fromBranchName,
        to_branch_id: transfer.to_branch_id,
        to_branch_name: toBranchName,
        items_count: itemsCount,
      },
    };
  }

  if (event === "transfer.received") {
    return {
      title: "Transfer received",
      body: `Transfer received at ${toBranchName} from ${fromBranchName}.`,
      linkUrl: buildTransferLink({ tab: "received", transferId }),
      dedupeKey: `inv:transfer:${transferId}:received`,
      kind: "inventory_transfer_received",
      payload: {
        inventory_event: event,
        transfer_id: transferId,
        from_branch_id: transfer.from_branch_id,
        from_branch_name: fromBranchName,
        to_branch_id: transfer.to_branch_id,
        to_branch_name: toBranchName,
        items_count: itemsCount,
      },
    };
  }

  const sentAt = transfer.sent_at ? new Date(transfer.sent_at) : null;
  const durationLabel =
    sentAt && !Number.isNaN(sentAt.getTime())
      ? formatDistanceToNowStrict(sentAt, { addSuffix: false })
      : `${getTransferOverdueHours()} hours`;

  return {
    title: "Transfer overdue",
    body: `Transfer to ${toBranchName} has been in transit for ${durationLabel}.`,
    linkUrl: buildTransferLink({ tab: "in-transit", transferId, overdue: true }),
    dedupeKey: `inv:transfer:${transferId}:overdue`,
    kind: "inventory_transfer_overdue",
    payload: {
      inventory_event: event,
      transfer_id: transferId,
      from_branch_id: transfer.from_branch_id,
      from_branch_name: fromBranchName,
      to_branch_id: transfer.to_branch_id,
      to_branch_name: toBranchName,
      items_count: itemsCount,
      sent_at: transfer.sent_at,
      duration_label: durationLabel,
    },
  };
}

async function buildReconciliationEnvelope(
  supabase: ServiceClient,
  event: "reconciliation.applied" | "reconciliation.large_variance",
  reconciliationId: string,
): Promise<NotificationEnvelope | null> {
  const { data, error } = await supabase
    .from("inventory_reconciliations")
    .select(
      "id,branch_id,status,applied_at,branches(id,name,city),inventory_reconciliation_lines(inventory_item_id,system_qty,counted_qty,delta_qty)",
    )
    .eq("id", reconciliationId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[inventoryNotifications] Failed to load reconciliation context:", error);
    }
    return null;
  }

  const reconciliation = data as unknown as ReconciliationRow;
  const branchName = reconciliation.branches?.name ?? "Unknown branch";
  const lines = reconciliation.inventory_reconciliation_lines ?? [];
  const adjustedLines = lines.filter((line) => toNumber(line.delta_qty) !== 0);
  const adjustedCount = adjustedLines.length;
  const netDelta = adjustedLines.reduce((sum, line) => sum + toNumber(line.delta_qty), 0);
  const maxVariance = adjustedLines.reduce(
    (largest, line) => Math.max(largest, Math.abs(toNumber(line.delta_qty))),
    0,
  );

  if (event === "reconciliation.applied") {
    return {
      title: "Stock reconciled",
      body: `Reconciliation applied for ${branchName} - ${adjustedCount} items adjusted (net ${netDelta}).`,
      linkUrl: buildReconciliationLink(reconciliationId),
      dedupeKey: `inv:recon:${reconciliationId}:applied`,
      kind: "inventory_reconciliation_applied",
      payload: {
        inventory_event: event,
        reconciliation_id: reconciliationId,
        branch_id: reconciliation.branch_id,
        branch_name: branchName,
        adjusted_count: adjustedCount,
        net_delta: netDelta,
        largest_variance: maxVariance,
      },
    };
  }

  return {
    title: "Large stock variance",
    body: `Large variance detected for ${branchName} (review adjustments).`,
    linkUrl: buildReconciliationLink(reconciliationId),
    dedupeKey: `inv:recon:${reconciliationId}:variance`,
    kind: "inventory_large_variance",
    payload: {
      inventory_event: event,
      reconciliation_id: reconciliationId,
      branch_id: reconciliation.branch_id,
      branch_name: branchName,
      adjusted_count: adjustedCount,
      net_delta: netDelta,
      largest_variance: maxVariance,
      variance_threshold: getLargeVarianceThreshold(),
    },
  };
}

async function buildExpiryEnvelope(
  supabase: ServiceClient,
  event: "expiry.expiring_soon" | "expiry.expired" | "expiry.disposed",
  batchId: string,
): Promise<NotificationEnvelope | null> {
  const { data, error } = await supabase
    .from("inventory_batches")
    .select(
      "id,branch_id,inventory_item_id,quantity,expires_at,lot_number,branches(id,name,city),inventory_items(id,name,sku,unit)",
    )
    .eq("id", batchId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[inventoryNotifications] Failed to load batch context:", error);
    }
    return null;
  }

  const batch = data as unknown as BatchRow;
  const branchName = batch.branches?.name ?? "Unknown branch";
  const itemName = batch.inventory_items?.name ?? "Inventory item";
  const quantity = toNumber(batch.quantity);
  const expiresAt = batch.expires_at ? new Date(batch.expires_at) : null;
  const daysUntilExpiry =
    expiresAt && !Number.isNaN(expiresAt.getTime())
      ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  if (event === "expiry.expiring_soon") {
    return {
      title: "Expiring soon",
      body: `${itemName} at ${branchName} expires in ${daysUntilExpiry ?? getExpirySoonDays()} days.`,
      linkUrl: buildExpiryLink("expiring-soon"),
      dedupeKey: `inv:expiry:${batchId}:expiringSoon`,
      kind: "inventory_expiring_soon",
      payload: {
        inventory_event: event,
        batch_id: batchId,
        branch_id: batch.branch_id,
        branch_name: branchName,
        item_id: batch.inventory_item_id,
        item_name: itemName,
        quantity,
        expires_at: batch.expires_at,
        expires_in_days: daysUntilExpiry,
        lot_number: batch.lot_number,
      },
    };
  }

  if (event === "expiry.expired") {
    return {
      title: "Expired stock",
      body: `Expired ${itemName} stock detected at ${branchName} (qty: ${quantity}).`,
      linkUrl: buildExpiryLink("expired"),
      dedupeKey: `inv:expiry:${batchId}:expired`,
      kind: "inventory_expired_stock",
      payload: {
        inventory_event: event,
        batch_id: batchId,
        branch_id: batch.branch_id,
        branch_name: branchName,
        item_id: batch.inventory_item_id,
        item_name: itemName,
        quantity,
        expires_at: batch.expires_at,
        lot_number: batch.lot_number,
      },
    };
  }

  return {
    title: "Expired stock disposed",
    body: `Expired stock write-off recorded for ${branchName}.`,
    linkUrl: buildExpiryLink("expired"),
    dedupeKey: `inv:expiry:${batchId}:disposed`,
    kind: "inventory_expired_stock_disposed",
    payload: {
      inventory_event: event,
      batch_id: batchId,
      branch_id: batch.branch_id,
      branch_name: branchName,
      item_id: batch.inventory_item_id,
      item_name: itemName,
      quantity,
      expires_at: batch.expires_at,
      lot_number: batch.lot_number,
    },
  };
}

async function buildEnvelope(
  supabase: ServiceClient,
  event: InventoryNotificationEvent,
  payload: Record<string, unknown>,
): Promise<NotificationEnvelope | null> {
  switch (event) {
    case "item.created":
      return buildItemCreatedEnvelope(supabase, String(payload.inventoryItemId));
    case "stock.low":
      return buildStockLevelEnvelope(supabase, event, {
        branchId: String(payload.branchId),
        inventoryItemId: String(payload.inventoryItemId),
        currentOnHand: toNumber(payload.currentOnHand),
      });
    case "stock.out":
      return buildStockLevelEnvelope(supabase, event, {
        branchId: String(payload.branchId),
        inventoryItemId: String(payload.inventoryItemId),
        currentOnHand: toNumber(payload.currentOnHand),
      });
    case "transfer.sent":
    case "transfer.received":
    case "transfer.overdue":
      return buildTransferEnvelope(supabase, event, String(payload.transferId));
    case "reconciliation.applied":
    case "reconciliation.large_variance":
      return buildReconciliationEnvelope(supabase, event, String(payload.reconciliationId));
    case "expiry.expiring_soon":
    case "expiry.expired":
    case "expiry.disposed":
      return buildExpiryEnvelope(supabase, event, String(payload.batchId));
    default:
      return null;
  }
}

async function notify(params: {
  supabase: ServiceClient;
  event: InventoryNotificationEvent;
  payload: Record<string, unknown>;
  actorUserId?: string | null;
}) {
  const envelope = await buildEnvelope(params.supabase, params.event, params.payload);
  if (!envelope) {
    return false;
  }

  return sendInventoryNotification({
    supabase: params.supabase,
    actorUserId: params.actorUserId ?? null,
    envelope,
  });
}

async function notifyStockTransitions(params: {
  supabase: ServiceClient;
  actorUserId?: string | null;
  transitions: StockThresholdTransitionPayload[];
}) {
  for (const transition of params.transitions) {
    const previous = toNumber(transition.previousOnHand);
    const current = toNumber(transition.currentOnHand);

    if (previous > 0 && current === 0) {
      await notify({
        supabase: params.supabase,
        actorUserId: params.actorUserId,
        event: "stock.out",
        payload: {
          branchId: transition.branchId,
          inventoryItemId: transition.inventoryItemId,
          currentOnHand: current,
        },
      });
      continue;
    }

    const { data } = await params.supabase
      .from("branch_inventory")
      .select("low_stock_threshold")
      .eq("branch_id", transition.branchId)
      .eq("inventory_item_id", transition.inventoryItemId)
      .maybeSingle();

    const threshold = toNumber(data?.low_stock_threshold);
    if (threshold > 0 && previous > threshold && current > 0 && current <= threshold) {
      await notify({
        supabase: params.supabase,
        actorUserId: params.actorUserId,
        event: "stock.low",
        payload: {
          branchId: transition.branchId,
          inventoryItemId: transition.inventoryItemId,
          currentOnHand: current,
        },
      });
    }
  }
}

async function runAlertSweep(params: {
  supabase: ServiceClient;
  actorUserId?: string | null;
}) {
  const summary = {
    overdueTransfersChecked: 0,
    overdueTransfersNotified: 0,
    expiringSoonChecked: 0,
    expiringSoonNotified: 0,
    expiredChecked: 0,
    expiredNotified: 0,
  };

  const overdueCutoff = new Date(Date.now() - getTransferOverdueHours() * 60 * 60 * 1000).toISOString();
  const { data: overdueTransfers, error: overdueError } = await params.supabase
    .from("inventory_transfers")
    .select("id")
    .eq("status", "sent")
    .not("sent_at", "is", null)
    .lte("sent_at", overdueCutoff);

  if (overdueError) {
    console.error("[inventoryNotifications] Failed loading overdue transfers:", overdueError);
  } else {
    summary.overdueTransfersChecked = overdueTransfers?.length ?? 0;
    for (const transfer of overdueTransfers ?? []) {
      const created = await notify({
        supabase: params.supabase,
        actorUserId: params.actorUserId,
        event: "transfer.overdue",
        payload: { transferId: transfer.id },
      });
      if (created) summary.overdueTransfersNotified += 1;
    }
  }

  if (isExpiryNotificationsEnabled()) {
    const today = new Date().toISOString().slice(0, 10);
    const soonCutoff = new Date(Date.now() + getExpirySoonDays() * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: expiringSoon, error: expiringSoonError } = await params.supabase
      .from("inventory_batches")
      .select("id")
      .gt("quantity", 0)
      .not("expires_at", "is", null)
      .gte("expires_at", today)
      .lte("expires_at", soonCutoff);

    if (expiringSoonError) {
      console.error("[inventoryNotifications] Failed loading expiring batches:", expiringSoonError);
    } else {
      summary.expiringSoonChecked = expiringSoon?.length ?? 0;
      for (const batch of expiringSoon ?? []) {
        const created = await notify({
          supabase: params.supabase,
          actorUserId: params.actorUserId,
          event: "expiry.expiring_soon",
          payload: { batchId: batch.id },
        });
        if (created) summary.expiringSoonNotified += 1;
      }
    }

    const { data: expired, error: expiredError } = await params.supabase
      .from("inventory_batches")
      .select("id")
      .gt("quantity", 0)
      .not("expires_at", "is", null)
      .lt("expires_at", today);

    if (expiredError) {
      console.error("[inventoryNotifications] Failed loading expired batches:", expiredError);
    } else {
      summary.expiredChecked = expired?.length ?? 0;
      for (const batch of expired ?? []) {
        const created = await notify({
          supabase: params.supabase,
          actorUserId: params.actorUserId,
          event: "expiry.expired",
          payload: { batchId: batch.id },
        });
        if (created) summary.expiredNotified += 1;
      }
    }
  }

  return summary;
}

export const inventoryNotifications = {
  notify,
  notifyStockTransitions,
  async notifyTransferSent(params: {
    supabase: ServiceClient;
    transferId: string;
    actorUserId?: string | null;
  }) {
    return notify({
      supabase: params.supabase,
      actorUserId: params.actorUserId,
      event: "transfer.sent",
      payload: { transferId: params.transferId },
    });
  },
  async notifyTransferReceived(params: {
    supabase: ServiceClient;
    transferId: string;
    actorUserId?: string | null;
  }) {
    return notify({
      supabase: params.supabase,
      actorUserId: params.actorUserId,
      event: "transfer.received",
      payload: { transferId: params.transferId },
    });
  },
  async notifyReconciliationApplied(params: {
    supabase: ServiceClient;
    reconciliationId: string;
    actorUserId?: string | null;
  }) {
    await notify({
      supabase: params.supabase,
      actorUserId: params.actorUserId,
      event: "reconciliation.applied",
      payload: { reconciliationId: params.reconciliationId },
    });

    const { data } = await params.supabase
      .from("inventory_reconciliations")
      .select("inventory_reconciliation_lines(delta_qty)")
      .eq("id", params.reconciliationId)
      .maybeSingle();

    const maxVariance = (data?.inventory_reconciliation_lines ?? []).reduce(
      (largest, line) => Math.max(largest, Math.abs(toNumber(line.delta_qty))),
      0,
    );

    if (maxVariance >= getLargeVarianceThreshold()) {
      await notify({
        supabase: params.supabase,
        actorUserId: params.actorUserId,
        event: "reconciliation.large_variance",
        payload: { reconciliationId: params.reconciliationId },
      });
    }
  },
  async notifyExpiryWriteOffCompleted(params: {
    supabase: ServiceClient;
    batchId: string;
    actorUserId?: string | null;
  }) {
    if (!isExpiryNotificationsEnabled()) {
      return false;
    }

    return notify({
      supabase: params.supabase,
      actorUserId: params.actorUserId,
      event: "expiry.disposed",
      payload: { batchId: params.batchId },
    });
  },
  async notifyItemCreated(params: {
    supabase: ServiceClient;
    inventoryItemId: string;
    actorUserId?: string | null;
  }) {
    return notify({
      supabase: params.supabase,
      actorUserId: params.actorUserId,
      event: "item.created",
      payload: { inventoryItemId: params.inventoryItemId },
    });
  },
  async notifyBatchExpiryIfWithinWindow(params: {
    supabase: ServiceClient;
    batchId: string;
    actorUserId?: string | null;
  }) {
    if (!isExpiryNotificationsEnabled()) {
      return false;
    }

    const { data, error } = await params.supabase
      .from("inventory_batches")
      .select("id, quantity, expires_at")
      .eq("id", params.batchId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("[inventoryNotifications] Failed to load batch expiry context:", error);
      }
      return false;
    }

    const event = getExpiryEventForBatch({
      quantity: toNumber(data.quantity),
      expiresAt: data.expires_at,
    });

    if (!event) {
      return false;
    }

    return notify({
      supabase: params.supabase,
      actorUserId: params.actorUserId,
      event,
      payload: { batchId: params.batchId },
    });
  },
  runAlertSweep,
  isExpiryNotificationsEnabled,
};
