import { Footer, Navbar } from "@/features/shared/navigation";
import { FavoritesProvider } from "@/features/customer/favorites/context/favorites-context";
import { AuthProvider } from "@/lib/auth/context";

// Navbar/AuthProviders construct Supabase clients during render — render
// on-demand so `next build` never executes Supabase code without env vars.
export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <Navbar />
        {children}
        <Footer />
      </FavoritesProvider>
    </AuthProvider>
  );
}
