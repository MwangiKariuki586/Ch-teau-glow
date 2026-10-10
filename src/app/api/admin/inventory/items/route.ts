import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inventoryNotifications } from "@/lib/notifications/inventory";
import { getAdminSession } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slugify";

const PAGE_SIZE = 20;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(PAGE_SIZE),
  q: z.string().trim().max(200).optional(),
  item_type: z.enum(["retail_product", "consumable", "all"]).default("all"),
  branch_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  low_stock_only: z.coerce.boolean().default(false),
  active_only: z.coerce.boolean().default(false),
});

// Zod v4 uses strict RFC 4122 UUID validation which rejects seeded/test UUIDs
// (e.g. 11111111-1111-1111-1111-111111111111). Use a loose UUID-shaped regex instead.
const uuidLike = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid ID format",
);

const createSchema = z.discriminatedUnion("item_type", [
  z.object({
    item_type: z.literal("consumable"),
    name: z.string().min(1).max(200),
    sku: z.string().max(100).optional().nullable(),
    unit: z.string().min(1).max(50).default("unit"),
    branch_id: uuidLike,
    is_active: z.boolean().default(true),
  }),
  z.object({
    item_type: z.literal("retail_product"),
    name: z.string().min(1).max(200),
    sku: z.string().max(100).optional().nullable(),
    unit: z.string().min(1).max(50).default("unit"),
    branch_id: uuidLike,
    is_active: z.boolean().default(true),
    category_id: uuidLike,
    price_display: z.string().min(1).max(200),
    price_value: z.coerce.number().nonnegative().optional().nullable(),
    description: z.string().max(5000).optional().nullable(),
    currency: z.string().min(1).max(10).default("AED"),
    slug: z.string().min(1).max(200).optional().nullable(),
    images: z.array(z.string().min(1)).max(10).default([]),
  }),
]);

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase, userId } = session.data;

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const { page, pageSize, q, item_type, branch_id, low_stock_only, active_only } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // If filtering by low_stock or branch, we need to join branch_inventory
  if (low_stock_only || branch_id) {
    // Get items that are low stock in the given branch (or any branch)
    let biQuery = supabase
      .from("branch_inventory")
      .select("inventory_item_id, on_hand, low_stock_threshold, branch_id");

    if (branch_id) biQuery = biQuery.eq("branch_id", branch_id);

    const { data: biRows, error: biError } = await biQuery;
    if (biError) return NextResponse.json({ error: biError.message }, { status: 400 });

    // Filter low stock in JS — on_hand <= low_stock_threshold (column vs column comparison)
    const filteredRows = low_stock_only
      ? (biRows ?? []).filter((r) => Number(r.on_hand) <= Number(r.low_stock_threshold))
      : (biRows ?? []);

    const itemIds = [...new Set(filteredRows.map((r) => r.inventory_item_id))];
    if (itemIds.length === 0) {
      return NextResponse.json({ data: [], page, pageSize, total: 0, totalPages: 0 });
    }

    let itemQuery = supabase
      .from("inventory_items")
      .select("*", { count: "exact" })
      .in("id", itemIds);

    if (q) itemQuery = itemQuery.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    if (item_type !== "all") itemQuery = itemQuery.eq("item_type", item_type);
    if (active_only) itemQuery = itemQuery.eq("is_active", true);

    itemQuery = itemQuery.order("name").range(from, to);
    const { data: items, error: itemsError, count } = await itemQuery;
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });

    const biMap = new Map<string, { on_hand: number; low_stock_threshold: number }[]>();
    for (const row of filteredRows) {
      const arr = biMap.get(row.inventory_item_id) ?? [];
      arr.push({ on_hand: Number(row.on_hand), low_stock_threshold: Number(row.low_stock_threshold) });
      biMap.set(row.inventory_item_id, arr);
    }

    const enriched = (items ?? []).map((item) => {
      const rows = biMap.get(item.id) ?? [];
      const total_on_hand = rows.reduce((s, r) => s + Number(r.on_hand), 0);
      const low_stock_branches = rows.filter((r) => Number(r.on_hand) <= Number(r.low_stock_threshold)).length;
      return { ...item, total_on_hand, low_stock_branches };
    });

    const total = count ?? 0;
    return NextResponse.json({ data: enriched, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  }

  // Standard query without branch filter
  let query = supabase.from("inventory_items").select("*", { count: "exact" });
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  if (item_type !== "all") query = query.eq("item_type", item_type);
  if (active_only) query = query.eq("is_active", true);
  query = query.order("name").range(from, to);

  const { data: items, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Enrich with aggregate stock info
  const itemIds = (items ?? []).map((i) => i.id);
  let enriched = (items ?? []).map((i) => ({ ...i, total_on_hand: 0, low_stock_branches: 0 }));

  if (itemIds.length > 0) {
    const { data: biRows } = await supabase
      .from("branch_inventory")
      .select("inventory_item_id, on_hand, low_stock_threshold")
      .in("inventory_item_id", itemIds);

    const biMap = new Map<string, { on_hand: number; low_stock_threshold: number }[]>();
    for (const row of biRows ?? []) {
      const arr = biMap.get(row.inventory_item_id) ?? [];
      arr.push({ on_hand: Number(row.on_hand), low_stock_threshold: Number(row.low_stock_threshold) });
      biMap.set(row.inventory_item_id, arr);
    }

    enriched = (items ?? []).map((item) => {
      const rows = biMap.get(item.id) ?? [];
      const total_on_hand = rows.reduce((s, r) => s + r.on_hand, 0);
      const low_stock_branches = rows.filter((r) => r.on_hand <= r.low_stock_threshold).length;
      return { ...item, total_on_hand, low_stock_branches };
    });
  }

  const total = count ?? 0;
  return NextResponse.json({ data: enriched, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession({
    useServiceRole: true,
    purpose: "admin_inventory_write",
  });
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase, userId } = session.data;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const payload =
    parsed.data.item_type === "retail_product"
      ? {
          ...parsed.data,
          slug: parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.name),
        }
      : parsed.data;

  const { data, error } = await supabase.rpc("create_inventory_asset", {
    p_payload: payload,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const inventoryItemId =
    data &&
    typeof data === "object" &&
    "inventory_item_id" in data &&
    typeof data.inventory_item_id === "string"
      ? data.inventory_item_id
      : null;

  if (inventoryItemId) {
    await inventoryNotifications.notifyItemCreated({
      supabase,
      inventoryItemId,
      actorUserId: userId,
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}
