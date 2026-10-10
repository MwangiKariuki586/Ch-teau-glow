import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type ServiceRolePurpose =
  | "booking_policy"
  | "availability_read"
  | "waitlist_dispatch"
  | "admin_bookings_read"
  | "customer_bookings_read"
  | "customer_orders_read"
  | "aftercare_dispatch"
  | "admin_customers_read"
  | "admin_analytics_read_users"
  | "contact_enquiry_write"
  | "newsletter_subscription_write"
  | "admin_support_read"
  | "follow_up_email_dispatch"
  | "consultation_submission_write"
  | "webhook_payment_status"
  | "shop_checkout_write"
  | "admin_walk_in"
  | "admin_dashboard_read"
  | "admin_schedule_read"
  | "admin_analytics_read"
  | "admin_offers_read"
  | "admin_offers_write"
  | "admin_packages_read"
  | "admin_packages_write"
  | "admin_inventory_write"
  | "admin_inventory_read";

const ALLOWED_SERVICE_ROLE_PURPOSES = new Set<ServiceRolePurpose>([
  "booking_policy",
  "availability_read",
  "waitlist_dispatch",
  "admin_bookings_read",
  "customer_bookings_read",
  "customer_orders_read",
  "aftercare_dispatch",
  "admin_customers_read",
  "admin_analytics_read_users",
  "contact_enquiry_write",
  "newsletter_subscription_write",
  "admin_support_read",
  "follow_up_email_dispatch",
  "consultation_submission_write",
  "webhook_payment_status",
  "shop_checkout_write",
  "admin_walk_in",
  "admin_dashboard_read",
  "admin_schedule_read",
  "admin_analytics_read",
  "admin_offers_read",
  "admin_offers_write",
  "admin_packages_read",
  "admin_packages_write",
  "admin_inventory_write",
  "admin_inventory_read",
]);

export async function createServiceRoleClient(purpose: ServiceRolePurpose) {
  if (!ALLOWED_SERVICE_ROLE_PURPOSES.has(purpose)) {
    throw new Error(`Blocked service role usage for unknown purpose '${purpose}'.`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Server misconfiguration: missing Supabase service config for operation '${purpose}'.`,
    );
  }

  // Service role client must be detached from user cookies/session so it can
  // execute privileged server-side mutations and audit writes reliably.
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
