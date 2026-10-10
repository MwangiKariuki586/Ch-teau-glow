import { NextRequest, NextResponse } from "next/server";
import { dispatchAftercareJobs } from "@/lib/aftercare/dispatch";

function authorizeDispatch(request: NextRequest) {
  const expectedSecrets = [
    process.env.AFTERCARE_DISPATCH_SECRET,
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
    const summary = await dispatchAftercareJobs();
    return NextResponse.json({
      data: summary,
      ran_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dispatcher failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
