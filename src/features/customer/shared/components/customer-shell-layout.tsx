import { SidebarProvider } from "@/components/ui/sidebar";
import { CustomerHeader } from "./customer-header";
import { CustomerSidebar } from "./customer-sidebar";

export function CustomerShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="customer-layout">
      <CustomerSidebar />
      <main className="flex min-h-svh flex-1 flex-col overflow-x-hidden">
        <CustomerHeader />
        <div className="flex-1 p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
