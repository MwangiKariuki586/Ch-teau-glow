export type ItemType = "retail_product" | "consumable";

export type MovementType =
  | "adjustment"
  | "transfer_out"
  | "transfer_in"
  | "reconciliation"
  | "sale"
  | "service_consumption"
  | "purchase_receipt";

export type TransferStatus = "draft" | "sent" | "received" | "cancelled";
export type ReconciliationStatus = "draft" | "applied" | "cancelled";

export interface InventoryItem {
  id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  item_type: ItemType;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // enriched
  total_on_hand?: number;
  low_stock_branches?: number;
}

export interface BranchStock {
  branch_id: string;
  inventory_item_id: string;
  on_hand: number;
  low_stock_threshold: number;
  reorder_point: number | null;
  updated_at: string;
  branch?: { id: string; name: string; city: string };
}

export interface InventoryMovement {
  id: string;
  movement_type: MovementType;
  branch_id: string;
  inventory_item_id: string;
  quantity_delta: number;
  reason_code: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface InventoryTransfer {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  status: TransferStatus;
  notes: string | null;
  created_by: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  from_branch?: { id: string; name: string; city: string };
  to_branch?: { id: string; name: string; city: string };
  inventory_transfer_items?: TransferItem[];
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  inventory_item_id: string;
  quantity: number;
  inventory_items?: { id: string; name: string; sku: string | null; unit: string };
}

export interface InventoryReconciliation {
  id: string;
  branch_id: string;
  status: ReconciliationStatus;
  notes: string | null;
  created_by: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  branches?: { id: string; name: string; city: string };
  inventory_reconciliation_lines?: ReconciliationLine[];
}

export interface ReconciliationLine {
  id: string;
  reconciliation_id: string;
  inventory_item_id: string;
  system_qty: number;
  counted_qty: number;
  delta_qty: number;
  notes: string | null;
  inventory_items?: { id: string; name: string; sku: string | null; unit: string };
}

export interface LowStockRow {
  branch_id: string;
  inventory_item_id: string;
  on_hand: number;
  low_stock_threshold: number;
  severity: "out_of_stock" | "low_stock";
  branch?: { id: string; name: string; city: string };
  item?: { id: string; name: string; sku: string | null; unit: string; item_type: ItemType; is_active?: boolean };
}

export interface Branch {
  id: string;
  name: string;
  city: string;
}

export type BatchSeverity = "expired" | "expiring_soon";

export interface InventoryBatch {
  id: string;
  inventory_item_id: string;
  branch_id: string;
  lot_number: string | null;
  quantity: number;
  expires_at: string | null;
  received_at: string;
  notes: string | null;
  created_at: string;
  // joined
  inventory_items?: { id: string; name: string; sku: string | null; unit: string; item_type: ItemType };
  branches?: { id: string; name: string; city: string };
  // enriched
  severity?: BatchSeverity;
}

export * from "./create-asset";
