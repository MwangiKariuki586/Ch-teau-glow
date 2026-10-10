import { CustomerShellLayout } from "@/features/customer/shared/components/customer-shell-layout";

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShellLayout>{children}</CustomerShellLayout>;
}
