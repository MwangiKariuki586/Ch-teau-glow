import type { MovementType, TransferStatus, ReconciliationStatus } from "../types";

export function formatMovementType(type: MovementType): string {
  const map: Record<MovementType, string> = {
    adjustment: "Adjustment",
    transfer_out: "Transfer Out",
    transfer_in: "Transfer In",
    reconciliation: "Reconciliation",
    sale: "Sale",
    service_consumption: "Service Use",
    purchase_receipt: "Purchase Receipt",
  };
  return map[type] ?? type;
}

export function movementTypeColor(type: MovementType): string {
  if (type === "transfer_in" || type === "purchase_receipt") return "text-emerald-600";
  if (type === "transfer_out" || type === "sale" || type === "service_consumption") return "text-rose-500";
  if (type === "adjustment") return "text-amber-600";
  return "text-gray-600";
}

export function transferStatusLabel(status: TransferStatus): string {
  const map: Record<TransferStatus, string> = {
    draft: "Draft",
    sent: "In Transit",
    received: "Received",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

export function transferStatusColor(status: TransferStatus): string {
  const map: Record<TransferStatus, string> = {
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    received: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

export function reconciliationStatusColor(status: ReconciliationStatus): string {
  const map: Record<ReconciliationStatus, string> = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    applied: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

export function formatDelta(delta: number, unit: string): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} ${unit}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json as T;
}
