import type { ServiceMutationInput } from "@/features/admin/services/lib/service-admin-schema";
import {
  SERVICE_OPTIONAL_DETAIL_CONFIG,
  SERVICE_OPTIONAL_DETAIL_FIELDS,
} from "@/features/admin/services/lib/service-detail-fields";

function normalizeMainDetails(payload: ServiceMutationInput) {
  const whatIsIt = payload.what_is_it.trim();
  const whoIsItFor =
    typeof payload.who_is_it_for === "string" && payload.who_is_it_for.trim().length > 0
      ? payload.who_is_it_for.trim()
      : null;
  const whoIsItNotFor =
    typeof payload.who_is_it_not_for === "string" &&
    payload.who_is_it_not_for.trim().length > 0
      ? payload.who_is_it_not_for.trim()
      : null;

  return {
    what_is_it: whatIsIt,
    who_is_it_for: whoIsItFor,
    who_is_it_not_for: whoIsItNotFor,
  };
}

function normalizeDetailValues(payload: ServiceMutationInput) {
  return SERVICE_OPTIONAL_DETAIL_FIELDS.reduce<Record<string, string | null>>(
    (accumulator, field) => {
      const value =
        field === "recovery_duration"
          ? payload.recovery_duration ?? payload.full_recovery
          : payload[field];
      accumulator[field] =
        typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
      return accumulator;
    },
    {},
  );
}

export async function syncServiceDetails(
  supabase: {
    from: (table: string) => any;
  },
  serviceId: string,
  payload: ServiceMutationInput,
) {
  const mainDetails = normalizeMainDetails(payload);
  const { error: serviceDetailsError } = await supabase.from("service_details").upsert(
    {
      service_id: serviceId,
      ...mainDetails,
    },
    { onConflict: "service_id" },
  );
  if (serviceDetailsError) throw serviceDetailsError;

  const normalized = normalizeDetailValues(payload);

  const rows = SERVICE_OPTIONAL_DETAIL_FIELDS.map((field) => {
    const config = SERVICE_OPTIONAL_DETAIL_CONFIG[field];
    return {
      field,
      detail_key: config.itemKey,
      display_label: config.label,
      display_order: config.sortOrder,
      detail_value: normalized[field],
    };
  });

  const deleteKeys = rows.filter((row) => !row.detail_value).map((row) => row.detail_key);
  if (deleteKeys.length > 0) {
    const { error } = await supabase
      .from("service_detail_items")
      .delete()
      .eq("service_id", serviceId)
      .in("detail_key", deleteKeys);
    if (error) throw error;
  }

  const upsertRows = rows
    .filter((row) => row.detail_value)
    .map((row) => ({
      service_id: serviceId,
      detail_key: row.detail_key,
      display_label: row.display_label,
      detail_value: row.detail_value,
      display_order: row.display_order,
    }));

  if (upsertRows.length > 0) {
    const { error } = await supabase
      .from("service_detail_items")
      .upsert(upsertRows, { onConflict: "service_id,detail_key" });
    if (error) throw error;
  }
}
