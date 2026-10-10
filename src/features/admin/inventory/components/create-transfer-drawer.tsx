"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Search } from "lucide-react";
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
import type { Branch, InventoryItem } from "../types";

interface TransferLineInput {
  inventory_item_id: string;
  itemName: string;
  unit: string;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  prefillFromBranchId?: string;
  prefillFromBranchName?: string;
  prefillItemId?: string;
  prefillItemName?: string;
}

export function CreateTransferDrawer({
  open,
  onOpenChange,
  onCreated,
  prefillFromBranchId,
  prefillFromBranchName,
  prefillItemId,
  prefillItemName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [fromBranchId, setFromBranchId] = useState(prefillFromBranchId ?? "");
  const [toBranchId, setToBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLineInput[]>(
    prefillItemId && prefillItemName
      ? [
          {
            inventory_item_id: prefillItemId,
            itemName: prefillItemName,
            unit: "unit",
            quantity: 1,
          },
        ]
      : [],
  );

  // Sync prefill values each time the drawer opens
  useEffect(() => {
    if (open) {
      setFromBranchId(prefillFromBranchId ?? "");
      setToBranchId("");
      setNotes("");
      setLines(
        prefillItemId && prefillItemName
          ? [
              {
                inventory_item_id: prefillItemId,
                itemName: prefillItemName,
                unit: "unit",
                quantity: 1,
              },
            ]
          : [],
      );
    }
  }, [open, prefillFromBranchId, prefillItemId, prefillItemName]);
  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/branches")
      .then((r) => r.json())
      .then((j) => setBranches(j.data ?? j ?? []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!itemSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/admin/inventory/items?q=${encodeURIComponent(itemSearch)}&pageSize=10`,
      );
      const json = await res.json();
      setSearchResults(json.data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [itemSearch]);

  const addLine = (item: InventoryItem) => {
    if (lines.some((l) => l.inventory_item_id === item.id)) return;
    setLines((prev) => [
      ...prev,
      {
        inventory_item_id: item.id,
        itemName: item.name,
        unit: item.unit,
        quantity: 1,
      },
    ]);
    setItemSearch("");
    setSearchResults([]);
  };

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.inventory_item_id !== id));

  const updateQty = (id: string, qty: number) =>
    setLines((prev) =>
      prev.map((l) =>
        l.inventory_item_id === id ? { ...l, quantity: qty } : l,
      ),
    );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const action = (e.nativeEvent as SubmitEvent).submitter
      ? ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement).value
      : "draft";

    if (!fromBranchId || !toBranchId) {
      toast.error("Select both source and destination branches.");
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.error("Source and destination must differ.");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item.");
      return;
    }
    if (lines.some((l) => l.quantity <= 0)) {
      toast.error("All quantities must be greater than zero.");
      return;
    }
    setLoading(true);
    try {
      // Create draft
      const res = await fetch("/api/admin/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_branch_id: fromBranchId,
          to_branch_id: toBranchId,
          notes: notes.trim() || null,
          items: lines.map((l) => ({
            inventory_item_id: l.inventory_item_id,
            quantity: l.quantity,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create transfer.");

      // If "Send Now", immediately send
      if (action === "send") {
        const sendRes = await fetch(
          `/api/admin/inventory/transfers/${json.data.id}/send`,
          { method: "POST" },
        );
        const sendJson = await sendRes.json();
        if (!sendRes.ok)
          throw new Error(
            sendJson.error ?? "Transfer created but failed to send.",
          );
        toast.success("Transfer sent. Stock deducted from source branch.");
      } else {
        toast.success("Transfer draft created.");
      }

      setFromBranchId(prefillFromBranchId ?? "");
      setToBranchId("");
      setNotes("");
      setLines([]);
      onCreated();
    } catch (err: unknown) {
      toast.error("Transfer failed.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Transfer</SheetTitle>
          <SheetDescription>Move stock between branches.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-1 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                From Branch <span className="text-red-500">*</span>
              </Label>
              {prefillFromBranchId ? (
                <div className="flex h-10 w-full items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  {prefillFromBranchName ??
                    branches.find((b) => b.id === fromBranchId)?.name ??
                    "Loading..."}
                </div>
              ) : (
                <Select value={fromBranchId} onValueChange={setFromBranchId}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                To Branch <span className="text-red-500">*</span>
              </Label>
              <Select value={toBranchId} onValueChange={setToBranchId}>
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Destination..." />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((b) => b.id !== fromBranchId)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Item search */}
          <div className="space-y-2">
            <Label>Items</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items to add..."
                className="pl-9 border-gray-200"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addLine(item)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FFF8F0] border-b border-gray-100 last:border-0 flex items-center justify-between"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-400 text-xs">{item.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          {lines.length > 0 && (
            <div className="space-y-2">
              {lines.map((line) => (
                <div
                  key={line.inventory_item_id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {line.itemName}
                    </p>
                    <p className="text-xs text-gray-400">{line.unit}</p>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) =>
                      updateQty(
                        line.inventory_item_id,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-20 border-gray-200 text-center"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(line.inventory_item_id)}
                    className="text-gray-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for transfer..."
              className="border-gray-200 resize-none"
              rows={2}
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
              name="action"
              value="draft"
              disabled={loading}
              variant="outline"
              className="border-gray-300"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Draft
            </Button>
            <Button
              type="submit"
              name="action"
              value="send"
              disabled={loading}
              className="bg-[#6B4423] hover:bg-[#4A2C1A] text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Now
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
