import { NextResponse } from "next/server";
import { z } from "zod";
import { SERVICE_STATUSES } from "@/lib/constants/service-status";
import { getAdminSession } from "@/lib/supabase/admin";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  status: z.enum(SERVICE_STATUSES),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid service id.", issues: parsedParams.error.issues },
      { status: 400 },
    );
  }

  const parsedBody = bodySchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const { supabase } = session.data;
  const { error } = await supabase
    .from("services")
    .update({ status: parsedBody.data.status })
    .eq("id", parsedParams.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id: parsedParams.data.id, status: parsedBody.data.status } });
}
