"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceived: () => void;
  inventoryItemId: string;
  itemName: string;
  branchId: string;
  branchName: string;
  unit: string;
}

export function ReceiveStockDrawer({
  open,
  onOpenChange,
  onReceived,
  inventoryItemId,
  itemName,
  branchId,
  branchName,
  unit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    quantity: "",
    lot_number: "",
    expires_at: "",
    received_at: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const reset = () =>
    setForm({
      quantity: "",
      lot_number: "",
      expires_at: "",
      received_at: new Date().toISOString().split("T")[0],
      notes: "",
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity);
    if (!qty || qty <= 0) {
      toast.error("Enter a positive quantity.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_item_id: inventoryItemId,
          branch_id: branchId,
          quantity: qty,
          lot_number: form.lot_number.trim() || null,
          expires_at: form.expires_at || null,
          received_at: form.received_at || null,
          notes: form.notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to receive stock.");
      toast.success(`Stock received: ${qty} ${unit} added to ${branchName}.`);
      reset();
      onReceived();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to receive stock.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Receive Stock</SheetTitle>
          <SheetDescription>
            {itemName} — {branchName}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-1 py-6">
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity ({unit}) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
              placeholder="e.g. 50"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lot_number">Lot / Batch Number</Label>
            <Input
              id="lot_number"
              value={form.lot_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, lot_number: e.target.value }))
              }
              placeholder="e.g. LOT-2024-001 (optional)"
              className="border-gray-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="received_at">Received Date</Label>
              <Input
                id="received_at"
                type="date"
                value={form.received_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, received_at: e.target.value }))
                }
                className="border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires_at">Expiry Date</Label>
              <Input
                id="expires_at"
                type="date"
                value={form.expires_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expires_at: e.target.value }))
                }
                className="border-gray-200"
              />
              <p className="text-xs text-gray-400">Leave blank if no expiry</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Optional notes (supplier, PO number, etc.)"
              className="border-gray-200 resize-none"
              rows={3}
            />
          </div>

          <SheetFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Receive Stock
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
