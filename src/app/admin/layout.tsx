export const dynamic = "force-dynamic";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/features/admin/shared/components/admin-sidebar";
import { AdminHeader } from "@/features/admin/shared/components/admin-header";
import { AuthProvider } from "@/lib/auth/context";
import { RoleProvider } from "@/features/admin/shared/context/role-context";
import "@mantine/core/styles.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <RoleProvider>
        <SidebarProvider className="admin-layout">
          <AdminSidebar />
          <main className="flex-1 overflow-x-hidden">
            <AdminHeader />
            <div className="p-3 sm:p-6 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-[#FFF8F0] overflow-y-auto">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </RoleProvider>
    </AuthProvider>
  );
}
