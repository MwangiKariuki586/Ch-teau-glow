export const SERVICE_STATUSES = ["published", "draft", "archived"] as const;

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const PUBLIC_SERVICE_STATUS: ServiceStatus = "published";
