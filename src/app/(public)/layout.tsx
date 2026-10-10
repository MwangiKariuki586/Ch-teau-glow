import { Footer, Navbar } from "@/features/shared/navigation";
import { FavoritesProvider } from "@/features/customer/favorites/context/favorites-context";
import { AuthProvider } from "@/lib/auth/context";

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
