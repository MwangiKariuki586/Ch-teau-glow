import { TransfersHub, InventoryNav } from "@/features/admin/inventory";

export const dynamic = "force-dynamic";

export default function TransfersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Move stock between branches with a two-step send/receive workflow.
        </p>
      </div>
      <InventoryNav />
      <TransfersHub />
    </div>
  );
}
