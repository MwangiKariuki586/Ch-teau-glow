"use client";

import Link from "next/link";
import { Calendar, LogOut, Menu, Shield, ShoppingCart } from "lucide-react";
import { User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  href: string;
  label: string;
};

type MobileNavbarProps = {
  navItems: NavItem[];
  totalItems: number;
  isAuthLoading: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  onSignOut: () => Promise<void>;
};

export function MobileNavbar({
  navItems,
  totalItems,
  isAuthLoading,
  isSignedIn,
  isAdmin,
  onSignOut,
}: MobileNavbarProps) {
  return (
    <div className="ml-auto flex items-center lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-800 hover:text-[#6B4423]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-gray-100 px-4 py-4 text-left">
            <SheetTitle className="text-base font-semibold text-[#6B4423]">
              Menu
            </SheetTitle>
          </SheetHeader>

          <div className="h-full overflow-y-auto px-4 pb-6">
            <nav className="flex flex-col gap-1 border-b border-gray-100 py-4">
              {navItems.map((item) => (
                <SheetClose asChild key={`mobile-${item.href}`}>
                  <Link
                    href={item.href}
                    className="rounded-md px-2 py-2 text-sm font-medium text-gray-800 transition hover:bg-[#f8f1e4] hover:text-[#6B4423]"
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>

            <div className="space-y-3 py-4">
              <SheetClose asChild>
                <Link
                  href="/cart"
                  className="flex items-center justify-between rounded-md border border-[#e7d3b2] px-3 py-2 text-sm font-medium text-[#6B4423]"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Cart
                  </span>
                  <span className="rounded-full bg-[#c9a961] px-2 py-0.5 text-xs font-bold text-white">
                    {totalItems}
                  </span>
                </Link>
              </SheetClose>

              {isAuthLoading ? (
                <div className="h-10 w-full animate-pulse rounded-md bg-gray-200" />
              ) : isSignedIn ? (
                <div className="space-y-2">
                  {isAdmin && (
                    <SheetClose asChild>
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[#6B4423] transition hover:bg-[#f8f1e4]"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </SheetClose>
                  )}

                  <SheetClose asChild>
                    <Link
                      href="/customer"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-gray-800 transition hover:bg-[#f8f1e4] hover:text-[#6B4423]"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Account
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      href="/customer/bookings"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-gray-800 transition hover:bg-[#f8f1e4] hover:text-[#6B4423]"
                    >
                      <Calendar className="h-4 w-4" />
                      My Bookings
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSignOut}
                      className="w-full justify-start gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </SheetClose>
                </div>
              ) : (
                <div className="space-y-2">
                  <SheetClose asChild>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-start gap-2 border-[#6B4423] text-[#6B4423] hover:bg-[#6B4423] hover:text-white"
                    >
                      <Link href="/auth/signin">
                        <UserIcon className="h-4.5 w-4.5" />
                        <span className="text-sm font-medium">Sign In</span>
                      </Link>
                    </Button>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button
                      asChild
                      className="w-full justify-start gap-2 bg-[#6B4423] hover:bg-[#4A2C1A]"
                    >
                      <Link href="/auth/signup">
                        <span className="text-sm font-medium">Sign Up</span>
                      </Link>
                    </Button>
                  </SheetClose>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
