import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface ReserveOrderInventoryResult {
  status: "reserved" | "already_reserved";
  order_id: string;
  inserted_movements: number;
}

export async function reserveOrderInventory(
  orderId: string,
): Promise<ReserveOrderInventoryResult> {
  const supabase = await createServiceRoleClient("shop_checkout_write");

  const { data, error } = await supabase.rpc("reserve_order_inventory", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (
    !data ||
    typeof data !== "object" ||
    !("status" in data) ||
    !("order_id" in data) ||
    !("inserted_movements" in data)
  ) {
    throw new Error("Unexpected reserve_order_inventory response.");
  }

  return data as ReserveOrderInventoryResult;
}
