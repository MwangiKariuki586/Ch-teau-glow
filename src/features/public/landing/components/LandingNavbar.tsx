"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MenuIcon,
  XIcon,
  ShoppingCart,
  LogOut,
  Calendar,
  Shield,
  ChevronDown,
} from "lucide-react";
import { User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { useCart } from "@/features/public/products/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { name: "Home", path: "/landing" },
  { name: "Services", path: "/services" },
  { name: "Shop", path: "/products" },
  { name: "About", path: "/about" },
  { name: "Offers", path: "/offers" },
  { name: "Blogs", path: "/blogs" },
];

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<"customer" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user, isLoading: authLoading } = useAuth();
  const { totalItems } = useCart();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) { setProfile(null); setUserRole(null); setLoading(false); return; }
      try {
        setLoading(true);
        const role = user.app_metadata?.role || "customer";
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
          });
        }
        setUserRole(role);
      } catch {
        setUserRole(user.app_metadata?.role || "customer");
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) fetchProfile();
  }, [user, authLoading]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const firstName = profile?.first_name || user?.email?.split("@")[0];
  const fullNameOrEmail =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user?.email || "Account";
  const isSignedIn = Boolean(user);
  const isAdmin = userRole === "admin";
  const isAuthLoading = authLoading || loading;

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-4" : "bg-white py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo - Left Side */}
        <Link href="/" className="flex items-center" aria-label="Château Glow home">
          <span className="text-xl font-bold tracking-tight text-[#6B4423]">
            Château Glow
          </span>
        </Link>

        {/* Desktop Navigation - Right Side */}
        <div className="hidden md:flex items-center gap-8">
          {/* Nav Links */}
          <nav className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                className={`text-sm transition-colors ${
                  pathname === link.path
                    ? "text-[#2C1A0E] font-medium"
                    : "text-[#6B4423]/60 hover:text-[#2C1A0E]"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Divider */}
          <div className="h-5 w-px bg-[#6B4423]/20" />

          {/* Cart */}
          <Link href="/cart" className="relative text-[#6B4423]/60 hover:text-[#2C1A0E] transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C9A96E] px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Auth */}
          {isAuthLoading ? (
            <div className="h-10 w-24 animate-pulse rounded-full bg-[#6B4423]/10" />
          ) : isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 rounded-full bg-[#6B4423] shadow-md hover:bg-[#4A2C1A]">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{firstName || "Account"}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{fullNameOrEmail}</p>
                    {user?.email && <p className="text-xs text-[#6B4423]/70">{user.email}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer font-medium text-[#6B4423]">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/customer" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    My Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/customer/bookings" className="cursor-pointer">
                    <Calendar className="mr-2 h-4 w-4" />
                    My Bookings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="gap-2 rounded-full border-[#6B4423] text-[#6B4423] hover:bg-[#6B4423] hover:text-white">
                <Link href="/auth/signin">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Sign In</span>
                </Link>
              </Button>
              <Button asChild className="gap-2 rounded-full bg-[#6B4423] shadow-md hover:bg-[#4A2C1A]">
                <Link href="/auth/signup">
                  <span className="text-sm font-medium">Sign Up</span>
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-[#2C1A0E] md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-t border-[#6B4423]/10 shadow-lg md:hidden">
          <div className="flex flex-col px-6 py-8 gap-6">
            {/* Mobile Logo */}
            <Link href="/landing" className="flex items-center pb-2" aria-label="Château Glow home">
              <span className="text-xl font-bold tracking-tight text-[#6B4423]">
                Château Glow
              </span>
            </Link>
            <div className="h-px bg-[#6B4423]/10" />
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                className="text-lg font-serif text-[#2C1A0E] hover:text-[#C9A96E] transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="h-px bg-[#6B4423]/10" />
            {isSignedIn ? (
              <>
                <Link href="/customer" className="text-lg font-serif text-[#2C1A0E] hover:text-[#C9A96E] transition-colors">
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-lg font-serif text-red-600 hover:text-red-700 transition-colors text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/auth/signin" className="text-lg font-serif text-[#2C1A0E] hover:text-[#C9A96E] transition-colors">
                Sign In
              </Link>
            )}
            <Link
              href="/book"
              className="bg-[#6B4423] text-white text-center py-3 rounded-xl font-medium hover:bg-[#4A2C1A] transition-colors mt-4"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
