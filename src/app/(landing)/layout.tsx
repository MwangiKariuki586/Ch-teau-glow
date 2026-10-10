import { Navbar, Footer } from "@/features/shared/navigation";
import { AuthProvider } from "@/lib/auth/context";
import { FavoritesProvider } from "@/features/customer/favorites/context/favorites-context";

// Navbar/AuthProviders construct Supabase clients during render — render
// on-demand so `next build` never executes Supabase code without env vars.
export const dynamic = "force-dynamic";

export default function LandingGroupLayout({
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
