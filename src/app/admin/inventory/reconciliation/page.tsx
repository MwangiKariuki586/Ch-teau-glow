import { createClient } from "@/lib/supabase/server";
import { InventoryNav } from "@/features/admin/inventory";
import { GlobalReconciliationView } from "@/features/admin/inventory/components/global-reconciliation-view";
import type { Branch } from "@/features/admin/inventory";

export const dynamic = "force-dynamic";

async function getBranches(): Promise<Branch[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("branches")
    .select("id,name,city")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as Branch[];
}

export default async function ReconciliationPage() {
  const branches = await getBranches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Run cycle counts for any branch — count stock, preview deltas, then
          apply.
        </p>
      </div>
      <InventoryNav />
      <GlobalReconciliationView branches={branches} />
    </div>
  );
}
