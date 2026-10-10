"use client";

import { useState, useEffect } from "react";
import { GitBranch } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch } from "../types";
import { InventoryList } from "./inventory-list";
import { InventoryNav } from "./inventory-nav";

export function InventoryPageShell() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("all");

  useEffect(() => {
    fetch("/api/admin/branches")
      .then((r) => r.json())
      .then((j) => setBranches(j.data ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track stock levels across all branches.
          </p>
        </div>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-[180px] border-gray-200 bg-white shadow-sm">
            <GitBranch className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <InventoryNav />
      <InventoryList branchId={branchId} />
    </div>
  );
}
