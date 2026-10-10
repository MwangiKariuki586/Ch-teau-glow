import { ExpiryDashboard, InventoryNav } from "@/features/admin/inventory";

export const dynamic = "force-dynamic";

export default function ExpiryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor items approaching or past their expiry date.
        </p>
      </div>
      <InventoryNav />
      <ExpiryDashboard />
    </div>
  );
}
