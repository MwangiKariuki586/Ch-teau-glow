import { NextRequest, NextResponse } from "next/server";
import { inventoryNotifications } from "@/lib/notifications/inventory";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function authorizeDispatch(request: NextRequest) {
  const expectedSecrets = [
    process.env.INVENTORY_ALERTS_SECRET,
    process.env.CRON_SECRET,
  ].filter((value): value is string => Boolean(value && value.trim()));

  if (expectedSecrets.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return expectedSecrets.some((secret) => authHeader === `Bearer ${secret}`);
}

async function handle(request: NextRequest) {
  if (!authorizeDispatch(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceRoleClient("admin_inventory_write");
    const summary = await inventoryNotifications.runAlertSweep({ supabase });

    return NextResponse.json({
      data: summary,
      ran_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inventory alerts sweep failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
