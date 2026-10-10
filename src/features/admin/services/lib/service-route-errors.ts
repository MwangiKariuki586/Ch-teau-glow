type LookupQuery = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string,
    ) => {
      maybeSingle: () => Promise<{
        data: { name?: string | null } | null;
        error: { message?: string } | null;
      }>;
    };
  };
};

type SupabaseLookup = {
  from: (table: string) => unknown;
};

const BRANCH_SERVICE_REMOVAL_PATTERN =
  /Cannot remove or deactivate branch service ([0-9a-f-]{36}) at branch ([0-9a-f-]{36}) while active specialists are assigned to it\./i;

async function lookupEntityName(
  supabase: SupabaseLookup,
  table: "branches" | "services",
  id: string,
) {
  try {
    const query = supabase.from(table) as LookupQuery;
    const { data } = await query
      .select("name")
      .eq("id", id)
      .maybeSingle();

    return data?.name?.trim() || null;
  } catch {
    return null;
  }
}

export async function toServiceAdminErrorResponse(params: {
  supabase: SupabaseLookup;
  error: { code?: string; message?: string };
  fallbackMessage: string;
}) {
  const { supabase, error, fallbackMessage } = params;

  if (error.code === "23505") {
    return {
      status: 409,
      error: error.message ?? "Duplicate value violates uniqueness.",
    };
  }

  const rawMessage = error.message ?? "";
  const branchServiceRemovalMatch = rawMessage.match(BRANCH_SERVICE_REMOVAL_PATTERN);
  if (branchServiceRemovalMatch) {
    const [, serviceId, branchId] = branchServiceRemovalMatch;
    const [serviceName, branchName] = await Promise.all([
      lookupEntityName(supabase, "services", serviceId),
      lookupEntityName(supabase, "branches", branchId),
    ]);

    const printableService = serviceName ? `"${serviceName}"` : "this service";
    const printableBranch = branchName ? `"${branchName}"` : "that branch";

    return {
      status: 409,
      error: `You can't remove ${printableBranch} from ${printableService} while active specialists at that branch are still assigned to it. Update those specialist assignments first, then try again.`,
    };
  }

  return {
    status: 400,
    error: rawMessage || fallbackMessage,
  };
}
