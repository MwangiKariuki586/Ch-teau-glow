"use client"

import { CustomerFavorites } from "@/features/customer/favorites";
import { useRequireAuth } from "@/lib/auth/hooks";

export default function CustomerFavoritesPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  // Always render CustomerFavorites immediately — it shows a skeleton internally.
  // We pass isAuthenticated so it knows when to actually fire the API fetch.
  // This avoids the long blank spinner while auth resolves.
  //
  // When isLoading is true (auth being checked), CustomerFavorites renders
  // the skeleton. Once isAuthenticated becomes true, it triggers the fetch.
  // useRequireAuth handles redirect if the user is not logged in at all.
  if (!isLoading && !isAuthenticated) {
    return null;
  }

  return <CustomerFavorites isAuthenticated={isAuthenticated} />;
}
