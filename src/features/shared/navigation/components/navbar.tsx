"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { useCart } from "@/features/public/products/hooks/use-cart";
import { DesktopNavbar } from "./desktop-navbar";
import { MobileNavbar } from "./mobile-navbar";

export function Navbar() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<"customer" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { totalItems } = useCart();
  const navItems = [
    { href: "/landing", label: "Landing" },
    { href: "/products", label: "Shop" },
    { href: "/services", label: "Services" },
    { href: "/about", label: "About Us" },
    { href: "/offers", label: "Offers" },
    { href: "/blogs", label: "Blogs" },
  ];

  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const role = user.app_metadata?.role || "customer";

        // Fetch profile from API endpoint
        const response = await fetch("/api/profile");
        console.log("Navbar - API response status:", response.status);

        if (response.ok) {
          const profileData = await response.json();
          console.log("Navbar - Profile from API:", profileData);

          const realProfileData = {
            first_name: profileData.first_name || "",
            last_name: profileData.last_name || "",
            full_name:
              profileData.first_name && profileData.last_name
                ? `${profileData.first_name} ${profileData.last_name}`.trim()
                : profileData.first_name || profileData.last_name || "",
            email: profileData.email || user.email,
            role: role,
          };

          console.log("Navbar - Final profile data:", realProfileData);
          setProfile(realProfileData);
        } else {
          console.error(
            "Navbar - API response failed:",
            response.status,
            response.statusText,
          );
          throw new Error("Failed to fetch profile");
        }

        setUserRole(role);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to auth metadata if API fails
        const role = user.app_metadata?.role || "customer";
        const fallbackProfileData = {
          first_name: user.user_metadata?.full_name?.split(" ")[0] || "",
          last_name:
            user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
          full_name: user.user_metadata?.full_name || "",
          email: user.email,
          role: role,
        };
        setProfile(fallbackProfileData);
        setUserRole(role);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/services?search=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "py-2" : "py-4",
      )}
    >
      <div className="px-5">
        <div
          className={cn(
            "rounded-full border px-8 py-4 shadow-lg backdrop-blur-sm transition-all duration-300 relative",
            isScrolled
              ? "border-white/30 bg-white/95 shadow-xl"
              : "border-white/20 bg-white/80",
          )}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Logo - Left Side */}
            <div className="lg:hidden">
              <Link
                href="/"
                className="flex items-center"
                aria-label="Château Glow home"
              >
                <span className="text-xl  tracking-tight text-[#6B4423]">
                  Château Glow
                </span>
              </Link>
            </div>

            <DesktopNavbar
              navItems={navItems}
              totalItems={totalItems}
              isAuthLoading={authLoading || loading}
              isSignedIn={Boolean(user)}
              isAdmin={userRole === "admin"}
              firstName={profile?.first_name || user?.email?.split("@")[0]}
              fullNameOrEmail={
                profile?.first_name && profile?.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : user?.email || "Account"
              }
              email={user?.email}
              onSignOut={handleSignOut}
            />

            <MobileNavbar
              navItems={navItems}
              totalItems={totalItems}
              isAuthLoading={authLoading || loading}
              isSignedIn={Boolean(user)}
              isAdmin={userRole === "admin"}
              onSignOut={handleSignOut}
            />
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for services, treatments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border-2 py-3 pl-12 pr-12 font-medium focus:border-[#6B4423]"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 transform"
                >
                  <X className="h-5 w-5" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
