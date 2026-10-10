"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
  city: string;
}

export function FulfillmentSettingsSection() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [branchesRes, settingRes] = await Promise.all([
          fetch("/api/branches-list").then((r) => r.json()),
          fetch("/api/admin/settings/fulfillment").then((r) => r.json()),
        ]);
        setBranches(branchesRes.data ?? []);
        const branchId = settingRes.default_fulfillment_branch_id ?? "";
        setCurrentBranchId(branchId);
        setSelectedBranchId(branchId);
      } catch {
        toast.error("Failed to load fulfillment settings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hasChanges = selectedBranchId !== currentBranchId;

  const handleSave = async () => {
    if (!selectedBranchId) {
      toast.error("Please select a branch.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/fulfillment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_fulfillment_branch_id: selectedBranchId,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to save.");
      }
      setCurrentBranchId(selectedBranchId);
      toast.success("Fulfillment settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#6B4423]" />
            Fulfillment Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure how shipping orders are fulfilled
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedBranchId(currentBranchId)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#6B4423] hover:bg-[#5A3A1D]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default Shipping Branch</CardTitle>
          <CardDescription>
            Stock for shipping orders is deducted from this branch. Pickup
            orders deduct from the branch the customer selects at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fulfillment-branch">Fulfillment Branch</Label>
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
            >
              <SelectTrigger id="fulfillment-branch" className="max-w-sm">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.city ? ` — ${branch.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Update this whenever your primary shipping location changes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
