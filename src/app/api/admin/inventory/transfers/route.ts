import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/supabase/admin";

const STATUSES = ["draft", "sent", "received", "cancelled"] as const;

const querySchema = z.object({
  status: z.enum(["draft", "sent", "received", "cancelled", "all"]).default("all"),
  // multi-status for "All" tab (comma-separated)
  statuses: z.string().optional(),
  overdue: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  from_branch_id: z.string().uuid().optional(),
  to_branch_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort: z.enum(["created_asc", "created_desc", "sent_asc", "received_desc"]).optional(),
});

const createSchema = z.object({
  from_branch_id: z.string().uuid(),
  to_branch_id: z.string().uuid(),
  notes: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        inventory_item_id: z.string().uuid(),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
});

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const { status, statuses, overdue, page, pageSize, q, from_branch_id, to_branch_id, date_from, date_to, sort } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const overdueHours = Math.max(
    1,
    Number.parseInt(process.env.INVENTORY_TRANSFER_OVERDUE_HOURS ?? "", 10) || 48,
  );
  const overdueCutoff = new Date(Date.now() - overdueHours * 60 * 60 * 1000).toISOString();

  // Determine sort order
  const defaultSort = status === "draft" ? "created_asc"
    : status === "sent" ? "sent_asc"
    : "created_desc";
  const effectiveSort = sort ?? defaultSort;

  let query = supabase
    .from("inventory_transfers")
    .select(
      "*, from_branch:branches!inventory_transfers_from_branch_id_fkey(id,name,city), to_branch:branches!inventory_transfers_to_branch_id_fkey(id,name,city), inventory_transfer_items(id, inventory_item_id, quantity, inventory_items(id,name,sku,unit))",
      { count: "exact" },
    )
    .range(from, to);

  // Status filtering
  if (status !== "all") {
    query = query.eq("status", status);
  } else if (statuses) {
    const statusList = statuses
      .split(",")
      .map((s) => s.trim())
      .filter((s) => STATUSES.includes(s as typeof STATUSES[number]));
    if (statusList.length > 0 && statusList.length < STATUSES.length) {
      query = query.in("status", statusList);
    }
  }

  if (overdue) {
    query = query.eq("status", "sent").not("sent_at", "is", null).lte("sent_at", overdueCutoff);
  }

  // Branch filters
  if (from_branch_id) query = query.eq("from_branch_id", from_branch_id);
  if (to_branch_id) query = query.eq("to_branch_id", to_branch_id);

  // Date range
  if (date_from) query = query.gte("created_at", date_from);
  if (date_to) query = query.lte("created_at", date_to);

  // Sorting
  if (effectiveSort === "created_asc") {
    query = query.order("created_at", { ascending: true });
  } else if (effectiveSort === "sent_asc") {
    query = query.order("sent_at", { ascending: true, nullsFirst: false });
  } else if (effectiveSort === "received_desc") {
    query = query.order("received_at", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let rows = data ?? [];

  // Client-side search (branch name + item name + short ID)
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter((t) => {
      const fromName = (t.from_branch as { name?: string } | null)?.name?.toLowerCase() ?? "";
      const toName = (t.to_branch as { name?: string } | null)?.name?.toLowerCase() ?? "";
      const shortId = t.id.slice(0, 8).toLowerCase();
      const itemNames = ((t.inventory_transfer_items ?? []) as { inventory_items?: { name?: string } }[])
        .map((i) => i.inventory_items?.name?.toLowerCase() ?? "")
        .join(" ");
      return (
        fromName.includes(lower) ||
        toName.includes(lower) ||
        shortId.includes(lower) ||
        itemNames.includes(lower)
      );
    });
  }

  const total = count ?? 0;
  return NextResponse.json({
    data: rows,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase, userId } = session.data;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { from_branch_id, to_branch_id, notes, items } = parsed.data;

  if (from_branch_id === to_branch_id) {
    return NextResponse.json({ error: "Source and destination branches must differ." }, { status: 422 });
  }

  const { data: transfer, error: transferError } = await supabase
    .from("inventory_transfers")
    .insert({ from_branch_id, to_branch_id, notes: notes ?? null, created_by: userId, status: "draft" })
    .select()
    .single();

  if (transferError) return NextResponse.json({ error: transferError.message }, { status: 400 });

  const transferItems = items.map((item) => ({
    transfer_id: transfer.id,
    inventory_item_id: item.inventory_item_id,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase.from("inventory_transfer_items").insert(transferItems);
  if (itemsError) {
    await supabase.from("inventory_transfers").delete().eq("id", transfer.id);
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  return NextResponse.json({ data: transfer }, { status: 201 });
}
