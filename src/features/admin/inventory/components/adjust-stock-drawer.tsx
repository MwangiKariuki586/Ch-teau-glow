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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjusted: () => void;
  branchId: string;
  branchName: string;
  inventoryItemId: string;
  itemName: string;
  currentOnHand: number;
  unit: string;
}

const REASON_CODES = [
  { value: "restock", label: "Restock / Purchase Receipt" },
  { value: "damage", label: "Damaged / Spoiled" },
  { value: "theft", label: "Theft / Loss" },
  { value: "correction", label: "Data Correction" },
  { value: "expiry", label: "Expired" },
  { value: "other", label: "Other" },
];

export function AdjustStockDrawer({
  open,
  onOpenChange,
  onAdjusted,
  branchId,
  branchName,
  inventoryItemId,
  itemName,
  currentOnHand,
  unit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [delta, setDelta] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");

  const deltaNum = parseFloat(delta) || 0;
  const newOnHand = currentOnHand + deltaNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delta || deltaNum === 0) {
      toast.error("Enter a non-zero quantity delta.");
      return;
    }
    if (!reasonCode) {
      toast.error("Select a reason code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: branchId,
          inventory_item_id: inventoryItemId,
          quantity_delta: deltaNum,
          reason_code: reasonCode,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Adjustment failed.");
      toast.success(
        `Stock adjusted. New on-hand: ${json.data.new_on_hand} ${unit}`,
      );
      setDelta("");
      setReasonCode("");
      setNotes("");
      onAdjusted();
    } catch (err: unknown) {
      toast.error("Adjustment failed.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adjust Stock</SheetTitle>
          <SheetDescription>
            {itemName} · {branchName}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-1 py-6">
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm">
            <p className="text-gray-500">Current on-hand</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {currentOnHand}{" "}
              <span className="text-base font-normal text-gray-500">
                {unit}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delta">
              Quantity Delta <span className="text-red-500">*</span>
            </Label>
            <Input
              id="delta"
              type="number"
              step="any"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. +10 or -3"
              className="border-gray-200"
            />
            {delta && deltaNum !== 0 && (
              <p
                className={`text-sm font-medium ${newOnHand < 0 ? "text-red-500" : "text-gray-600"}`}
              >
                New on-hand: {newOnHand} {unit}
                {newOnHand < 0 && " (negative — not allowed)"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="border-gray-200">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {REASON_CODES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context..."
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
              disabled={loading || newOnHand < 0}
              className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Adjustment
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
