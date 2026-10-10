"use client";

import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  LogOut,
  Shield,
  ShoppingCart,
} from "lucide-react";
import { User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  href: string;
  label: string;
};

type DesktopNavbarProps = {
  navItems: NavItem[];
  totalItems: number;
  isAuthLoading: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  firstName?: string;
  fullNameOrEmail: string;
  email?: string;
  onSignOut: () => Promise<void>;
};

export function DesktopNavbar({
  navItems,
  totalItems,
  isAuthLoading,
  isSignedIn,
  isAdmin,
  firstName,
  fullNameOrEmail,
  email,
  onSignOut,
}: DesktopNavbarProps) {
  return (
    <>
      <nav className="hidden items-center gap-4 lg:flex">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative font-medium text-gray-800 transition hover:text-[#6B4423]"
          >
            {item.label}
            <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#6B4423] transition-all group-hover:w-full" />
          </Link>
        ))}
      </nav>

      <div className="absolute left-1/2 z-10 hidden -translate-x-1/2 transform lg:block">
        <Link href="/" className="flex items-center" aria-label="Château Glow home">
          <span className="text-2xl font-bold tracking-tight text-[#6B4423]">
            Château Glow
          </span>
        </Link>
      </div>

      <div className="hidden items-center gap-4 lg:flex">
        <Link href="/cart" className="relative">
          <button
            className="relative text-gray-800 transition hover:text-[#6B4423]"
            aria-label={`Cart with ${totalItems} item${totalItems === 1 ? "" : "s"}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9a961] px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>
        </Link>

        {isAuthLoading ? (
          <div className="h-10 w-24 animate-pulse rounded-full bg-gray-200" />
        ) : isSignedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 rounded-full bg-[#6B4423] shadow-md hover:bg-[#4A2C1A]">
                <UserIcon className="h-4.5 w-4.5" />
                <span className="text-sm font-medium">
                  {firstName || "Account"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-55">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{fullNameOrEmail}</p>
                  {email && <p className="text-xs text-gray-500">{email}</p>}
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
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="gap-2 rounded-full border-[#6B4423] text-[#6B4423] hover:bg-[#6B4423] hover:text-white"
            >
              <Link href="/auth/signin">
                <UserIcon className="h-4.5 w-4.5" />
                <span className="text-sm font-medium">Sign In</span>
              </Link>
            </Button>
            <Button
              asChild
              className="gap-2 rounded-full bg-[#6B4423] shadow-md hover:bg-[#4A2C1A]"
            >
              <Link href="/auth/signup">
                <span className="text-sm font-medium">Sign Up</span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
