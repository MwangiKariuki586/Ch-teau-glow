"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Calendar,
  Clock3,
  Heart,
  Package,
  Settings,
  User,
  Home,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Overview", url: "/customer", icon: Home },
  { title: "My Bookings", url: "/customer/bookings", icon: Calendar },
  { title: "My Waitlists", url: "/customer/waitlists", icon: Clock3 },
  { title: "My Orders", url: "/customer/orders", icon: Package },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Favorites", url: "/customer/favorites", icon: Heart },
  { title: "Complaints", url: "/customer/complaints", icon: ShieldAlert },
  { title: "Profile", url: "/customer/profile", icon: User },
  { title: "Settings", url: "/customer/settings", icon: Settings },
];

export function CustomerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<{
    full_name: string;
    avatar_url: string;
    email: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !user) return setProfile(null);
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setProfile({
          full_name: [data.first_name, data.last_name]
            .filter(Boolean)
            .join(" "),
          avatar_url: data.avatar_url || "",
          email: data.email || user.email || "",
        });
      } catch {
        setProfile(null);
      }
    };
    fetchProfile();
  }, [user?.id, isAuthenticated]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName = profile?.full_name?.trim() || "My Account";
  const initials = profile?.full_name
    ? profile.full_name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-6 border-b border-white/10">
        <Link
          href="/"
          className="flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Château Glow home"
        >
          <span className="text-xl font-bold tracking-tight text-white">
            Château Glow
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 px-3">
            My Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="rounded-lg px-3 py-2.5 font-medium transition-all duration-150 text-white/70 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:shadow-sm"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-14 px-3 rounded-xl bg-black/10 hover:bg-black/20 flex items-center justify-between group transition-colors border border-white/10"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 ring-2 ring-white/20">
                  <AvatarImage
                    src={profile?.avatar_url || ""}
                    alt="User avatar"
                  />
                  <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start max-w-[110px]">
                  <span className="text-sm font-semibold text-white truncate w-full">
                    {mounted ? displayName : "My Account"}
                  </span>
                  <span className="text-xs text-white/50 truncate w-full">
                    {mounted ? profile?.email || user?.email || "" : ""}
                  </span>
                </div>
              </div>
              <LogOut className="h-4 w-4 text-white/40 group-hover:text-white transition-colors" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 shadow-2xl mb-2 ml-4"
            side="top"
            align="start"
            forceMount
          >
            <DropdownMenuLabel className="font-normal px-3 py-2">
              <p className="text-sm font-semibold">
                {mounted ? displayName : "My Account"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {mounted ? profile?.email || user?.email : ""}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/customer/profile"
                className="cursor-pointer flex items-center"
              >
                <User className="mr-2 h-4 w-4 text-[#6B4423]" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
