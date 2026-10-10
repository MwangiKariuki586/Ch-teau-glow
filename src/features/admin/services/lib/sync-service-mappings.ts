import type { ServiceMutationInput } from "@/features/admin/services/lib/service-admin-schema";

function normalizeMappings(payload: ServiceMutationInput) {
  const branchIds = Array.from(new Set(payload.branch_ids));

  return {
    branchIds,
  };
}

type ServiceBranchMapping = {
  branch_id: string;
  is_active: boolean;
};

type SupabaseLikeError = {
  message: string;
};

type ServiceBranchesTable = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string,
    ) => Promise<{ data: ServiceBranchMapping[] | null; error: SupabaseLikeError | null }>;
  };
  delete: () => {
    eq: (column: string, value: string) => {
      in: (
        column: string,
        values: string[],
      ) => Promise<{ error: SupabaseLikeError | null }>;
    };
  };
  upsert: (
    values: Array<{ branch_id: string; service_id: string; is_active: boolean }>,
    options: { onConflict: string },
  ) => Promise<{ error: SupabaseLikeError | null }>;
};

export async function syncServiceMappings(
  supabase: {
    from: (table: string) => unknown;
  },
  serviceId: string,
  payload: ServiceMutationInput,
) {
  const mappings = normalizeMappings(payload);
  const desiredBranchIds = new Set(mappings.branchIds);
  const serviceBranchesTable = supabase.from("service_branches") as ServiceBranchesTable;

  const { data: existingMappings, error: existingMappingsError } = await serviceBranchesTable
    .select("branch_id,is_active")
    .eq("service_id", serviceId);

  if (existingMappingsError) throw existingMappingsError;

  const existingBranchIds = new Set(
    ((existingMappings ?? []) as ServiceBranchMapping[]).map((mapping) => mapping.branch_id),
  );
  const branchIdsToDelete = [...existingBranchIds].filter(
    (branchId) => !desiredBranchIds.has(branchId),
  );
  const branchIdsToUpsert = [...desiredBranchIds];

  if (branchIdsToDelete.length > 0) {
    const { error: deleteError } = await serviceBranchesTable
      .delete()
      .eq("service_id", serviceId)
      .in("branch_id", branchIdsToDelete);

    if (deleteError) throw deleteError;
  }

  if (branchIdsToUpsert.length > 0) {
    const { error } = await serviceBranchesTable.upsert(
      branchIdsToUpsert.map((branchId) => ({
        branch_id: branchId,
        service_id: serviceId,
        is_active: true,
      })),
      { onConflict: "service_id,branch_id" },
    );
    if (error) throw error;
  }

  // Note: Specialist-service relationships are managed through the specialist admin interface.
  // Services only manage branch assignments here.
}
