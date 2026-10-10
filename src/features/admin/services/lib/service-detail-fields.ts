export const SERVICE_OPTIONAL_DETAIL_FIELDS = [
  "results_duration",
  "discomfort_level",
  "side_effects",
  "recovery_duration",
  "downtime",
] as const;

export type ServiceOptionalDetailField = (typeof SERVICE_OPTIONAL_DETAIL_FIELDS)[number];

export const SERVICE_OPTIONAL_DETAIL_CONFIG: Record<
  ServiceOptionalDetailField,
  { itemKey: string; label: string; sortOrder: number; legacyItemKeys?: string[] }
> = {
  results_duration: {
    itemKey: "results_duration",
    label: "Results Duration",
    sortOrder: 20,
    legacyItemKeys: ["duration"],
  },
  discomfort_level: {
    itemKey: "discomfort_level",
    label: "Discomfort Level",
    sortOrder: 30,
  },
  side_effects: {
    itemKey: "side_effects",
    label: "Side Effects",
    sortOrder: 40,
    legacyItemKeys: ["side_effect"],
  },
  recovery_duration: {
    itemKey: "recovery_duration",
    label: "Recovery Duration",
    sortOrder: 45,
    legacyItemKeys: ["full_recovery"],
  },
  downtime: {
    itemKey: "downtime",
    label: "Downtime",
    sortOrder: 50,
  },
};

export const SERVICE_OPTIONAL_DETAIL_ITEM_KEYS = Object.values(
  SERVICE_OPTIONAL_DETAIL_CONFIG,
).flatMap((item) => [item.itemKey, ...(item.legacyItemKeys ?? [])]);
