import { Navbar, Footer } from "@/features/shared/navigation";
import { AuthProvider } from "@/lib/auth/context";
import { FavoritesProvider } from "@/features/customer/favorites/context/favorites-context";

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
