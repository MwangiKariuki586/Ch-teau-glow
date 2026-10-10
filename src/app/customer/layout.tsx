import { SidebarProvider } from "@/components/ui/sidebar";
import { CustomerSidebar } from "@/features/customer/shared/components/customer-sidebar";
import { CustomerHeader } from "@/features/customer/shared/components/customer-header";
import { FavoritesProvider } from "@/features/customer/favorites/context/favorites-context";
import { AuthProvider } from "@/lib/auth/context";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <SidebarProvider className="customer-layout">
          <CustomerSidebar />
          <main className="flex-1 overflow-x-hidden">
            <CustomerHeader />
            <div className="p-3 sm:p-6">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
