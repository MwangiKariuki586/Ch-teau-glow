import { CustomerShellLayout } from "@/features/customer/shared/components/customer-shell-layout";

// Shell queries Supabase during render — render on-demand so `next build`
// never executes Supabase code without env vars.
export const dynamic = "force-dynamic";

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShellLayout>{children}</CustomerShellLayout>;
}
