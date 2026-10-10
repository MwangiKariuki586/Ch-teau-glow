import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }
  const { supabase } = session.data;
  const { id } = await params;

  const { data: transfer } = await supabase
    .from("inventory_transfers")
    .select("status")
    .eq("id", id)
    .single();

  if (!transfer) return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  if (!["draft", "sent"].includes(transfer.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a transfer with status "${transfer.status}".` },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("inventory_transfers")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
