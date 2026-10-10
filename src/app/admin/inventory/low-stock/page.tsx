import { createClient } from "@/lib/supabase/server";
import { LowStockDashboard, InventoryNav } from "@/features/admin/inventory";
import type { LowStockRow, Branch } from "@/features/admin/inventory";

export const dynamic = "force-dynamic";

async function getLowStockData(): Promise<{
  rows: LowStockRow[];
  branches: Branch[];
}> {
  const supabase = await createClient();

  const [lowStockRes, branchesRes] = await Promise.all([
    supabase
      .from("branch_inventory")
      .select(
        "branch_id, inventory_item_id, on_hand, low_stock_threshold, branches(id,name,city), inventory_items(id,name,sku,unit,item_type,is_active)",
      )
      .filter("on_hand", "lte", "low_stock_threshold"),
    supabase
      .from("branches")
      .select("id,name,city")
      .eq("is_active", true)
      .order("name"),
  ]);

  const rows: LowStockRow[] = (lowStockRes.data ?? [])
    .map((row) => ({
      branch_id: row.branch_id,
      inventory_item_id: row.inventory_item_id,
      on_hand: Number(row.on_hand),
      low_stock_threshold: Number(row.low_stock_threshold),
      severity: (Number(row.on_hand) === 0 ? "out_of_stock" : "low_stock") as
        | "out_of_stock"
        | "low_stock",
      branch: Array.isArray(row.branches)
        ? row.branches[0]
        : (row.branches as Branch | undefined),
      item: Array.isArray(row.inventory_items)
        ? row.inventory_items[0]
        : (row.inventory_items as LowStockRow["item"] | undefined),
    }))
    .filter((r) => r.item?.is_active !== false)
    .sort((a, b) => {
      if (a.severity !== b.severity)
        return a.severity === "out_of_stock" ? -1 : 1;
      const ca =
        a.low_stock_threshold > 0 ? a.on_hand / a.low_stock_threshold : 0;
      const cb =
        b.low_stock_threshold > 0 ? b.on_hand / b.low_stock_threshold : 0;
      return ca - cb;
    });

  const branches: Branch[] = (branchesRes.data ?? []) as Branch[];
  return { rows, branches };
}

export default async function LowStockPage() {
  const { rows, branches } = await getLowStockData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Items at or below their low-stock threshold across all branches.
        </p>
      </div>
      <InventoryNav />
      <LowStockDashboard initialData={rows} branches={branches} />
    </div>
  );
}
