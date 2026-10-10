"use client";

import { Loader2, Send, PackageCheck, XCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { InventoryTransfer } from "../types";
import { transferStatusLabel, transferStatusColor, formatDate } from "../utils";

interface Props {
  transfer: InventoryTransfer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionBusy: string | null;
  onSend: (id: string) => void;
  onReceive: (id: string) => void;
  onCancel: (id: string) => void;
}

export function TransferDetailsDrawer({
  transfer: t,
  open,
  onOpenChange,
  actionBusy,
  onSend,
  onReceive,
  onCancel,
}: Props) {
  if (!t) return null;

  const items = t.inventory_transfer_items ?? [];
  const isBusy = actionBusy === t.id;

  const timelineEvents = [
    { label: "Created", value: t.created_at },
    t.sent_at ? { label: "Sent", value: t.sent_at } : null,
    t.received_at ? { label: "Received", value: t.received_at } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md p-0 flex flex-col h-full"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <SheetHeader className="space-y-0.5">
            <SheetTitle className="text-base">Transfer Details</SheetTitle>
            <SheetDescription className="font-mono text-xs">
              {t.id.slice(0, 8)}…{t.id.slice(-4)}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3">
            <Badge
              variant="outline"
              className={cn("text-xs", transferStatusColor(t.status))}
            >
              {transferStatusLabel(t.status)}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Route */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Route
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <span>{t.from_branch?.name ?? t.from_branch_id}</span>
              <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{t.to_branch?.name ?? t.to_branch_id}</span>
            </div>
            {(t.from_branch?.city || t.to_branch?.city) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {t.from_branch?.city} → {t.to_branch?.city}
              </p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Timeline
            </p>
            <div className="space-y-1.5">
              {timelineEvents.map((e) => (
                <div
                  key={e.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-500">{e.label}</span>
                  <span className="text-gray-700 text-xs">
                    {formatDate(e.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Items ({items.length})
            </p>
            {items.length === 0 ? (
              <p className="text-sm text-gray-400">No items.</p>
            ) : (
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Item
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium text-sm">
                            {item.inventory_items?.name ??
                              item.inventory_item_id}
                          </p>
                          {item.inventory_items?.sku && (
                            <p className="text-xs text-gray-400">
                              {item.inventory_items.sku}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 font-medium">
                          {item.quantity}
                          <span className="text-xs text-gray-400 ml-1">
                            {item.inventory_items?.unit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          {t.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm text-gray-600">{t.notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(t.status === "draft" || t.status === "sent") && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              {t.status === "draft" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(t.id)}
                    disabled={isBusy}
                    className="text-xs text-gray-400 hover:text-red-500 border border-gray-200"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSend(t.id)}
                    disabled={isBusy}
                    className="flex-1 bg-[#6B4423] hover:bg-[#4A2C1A] text-white text-xs"
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Send Transfer
                  </Button>
                </>
              )}
              {t.status === "sent" && (
                <Button
                  size="sm"
                  onClick={() => onReceive(t.id)}
                  disabled={isBusy}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <PackageCheck className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Mark Received
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
