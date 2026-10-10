import { InventoryItemWorkspace } from "@/features/admin/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <InventoryItemWorkspace itemId={id} />
    </div>
  );
}
