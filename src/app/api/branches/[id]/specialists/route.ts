import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { monitorQuery } from "@/lib/monitoring/query-performance";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const parsed = paramsSchema.safeParse(resolvedParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid branch ID.", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient("availability_read");
    const branchId = parsed.data.id;

    // Verify branch exists and is active
    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("is_active", true)
      .maybeSingle();

    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found or inactive." },
        { status: 404 }
      );
    }

    // Get specialists assigned to this branch via junction table (specialist_branches)
    // Falls back to direct branch_id FK if junction table is unavailable
    const specialists = await monitorQuery(
      'branch-specialists-lookup',
      async () => {
        const { data, error } = await supabase
          .from("specialist_branches")
          .select(`
            specialist:specialists(
              id,
              name,
              title,
              bio,
              email,
              phone,
              image_url,
              specialties,
              availability,
              is_active,
              created_at,
              updated_at
            )
          `)
          .eq("branch_id", branchId)
          .eq("is_active", true);

        if (error) {
          // Fallback: use direct branch_id FK if junction table doesn't exist yet
          const { data: fallback, error: fallbackError } = await supabase
            .from("specialists")
            .select(`
              id,
              name,
              title,
              bio,
              email,
              phone,
              image_url,
              specialties,
              availability,
              is_active,
              created_at,
              updated_at
            `)
            .eq("branch_id", branchId)
            .eq("is_active", true)
            .order("name", { ascending: true });

          if (fallbackError) throw fallbackError;
          return fallback;
        }

        // Flatten the nested specialist objects and filter active ones
        return (data ?? [])
          .map(row => (Array.isArray(row.specialist) ? row.specialist[0] : row.specialist))
          .filter(s => s && s.is_active)
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      { branch_id: branchId }
    );
    
    return NextResponse.json({ data: specialists ?? [] });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}