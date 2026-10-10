import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient, type ServiceRolePurpose } from "@/lib/supabase/service-role";

export interface AdminSessionResult {
  supabase: Awaited<ReturnType<typeof createClient>> | Awaited<ReturnType<typeof createServiceRoleClient>>;
  userId: string;
}

export async function getAdminSession(options?: {
  useServiceRole?: boolean;
  purpose?: ServiceRolePurpose;
}): Promise<
  | { ok: true; data: AdminSessionResult }
  | { ok: false; status: number; message: string }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, message: "Authentication required." };
  }

  // Use app_metadata.role for consistency with other auth checks
  if (user.app_metadata?.role !== 'admin') {
    return { ok: false, status: 403, message: "Admin access required." };
  }

  // If service role is requested, create a service role client
  let finalSupabase: AdminSessionResult["supabase"];
  if (options?.useServiceRole && options?.purpose) {
    try {
      finalSupabase = await createServiceRoleClient(options.purpose);
    } catch (error) {
      return {
        ok: false,
        status: 500,
        message: error instanceof Error ? error.message : "Failed to create service role client",
      };
    }
  } else {
    finalSupabase = supabase;
  }

  return { ok: true, data: { supabase: finalSupabase, userId: user.id } };
}
