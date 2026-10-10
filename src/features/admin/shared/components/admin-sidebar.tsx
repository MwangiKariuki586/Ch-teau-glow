"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  Store,
  Package,
  User as UserIcon,
  LogOut,
  Activity,
  Bell,
  ShieldAlert,
  Building2,
  GitBranch,
  Tag,
  Gift,
  Boxes,
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
import { cn } from "@/lib/utils";
import type { AdminProfile } from "@/features/admin/profile/types";
import { useRole } from "@/features/admin/shared/context/role-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// ── Role definitions ────────────────────────────────────────────────────────

type StaffRole = "Admin" | "Concierge" | "Specialist" | "Branch Manager";

const ROLES: StaffRole[] = [
  "Admin",
  "Concierge",
  "Specialist",
  "Branch Manager",
];

const allNavItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Appointments", url: "/admin/bookings", icon: Calendar },
  { title: "Analytics", url: "/admin/analytics", icon: Activity },
  { title: "Service Catalogue", url: "/admin/services", icon: Package },
  { title: "Product Catalogue", url: "/admin/products", icon: Store },
  { title: "Packages", url: "/admin/packages", icon: Gift },
  { title: "Offers", url: "/admin/offers", icon: Tag },
  { title: "Inventory", url: "/admin/inventory", icon: Boxes },
  { title: "Branch Catalogue", url: "/admin/branches", icon: GitBranch },
  { title: "Practitioners", url: "/admin/specialists", icon: Users },
  { title: "Client Records", url: "/admin/customers", icon: UserIcon },
  { title: "Recovery Center", url: "/admin/recovery-center", icon: ShieldAlert },
  { title: "Branch Cockpit", url: "/admin/branch-cockpit", icon: Building2 },
  { title: "Content", url: "/admin/content", icon: FileText },
  { title: "Support", url: "/admin/support", icon: MessageSquare },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

// Titles visible per role (Admin sees everything)
const roleNavTitles: Record<StaffRole, string[]> = {
  Admin: allNavItems.map((i) => i.title),
  Concierge: ["Dashboard", "Notifications", "Settings", "Support"],
  Specialist: ["Dashboard", "Appointments", "Notifications", "Settings"],
  "Branch Manager": [
    "Dashboard",
    "Branch Cockpit",
    "Notifications",
    "Settings",
  ],
};

const roleBadgeColor: Record<StaffRole, string> = {
  Admin: "bg-[#3E2723] text-[#C9A96E]",
  Concierge: "bg-blue-900/40 text-blue-200",
  Specialist: "bg-emerald-900/40 text-emerald-200",
  "Branch Manager": "bg-amber-900/40 text-amber-200",
};

// ── Component ───────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await fetch("/api/profile");
          if (response.ok) {
            const profileData = await response.json();
            const adminProfile: AdminProfile = {
              id: profileData.id || user.id,
              email: profileData.email || user.email || "",
              full_name:
                profileData.first_name && profileData.last_name
                  ? `${profileData.first_name} ${profileData.last_name}`.trim()
                  : profileData.first_name || profileData.last_name || "",
              avatar_url: profileData.avatar_url || "",
              phone: profileData.phone || "",
              bio: profileData.bio || "",
              department: profileData.department || "",
              location: profileData.location || "",
              role: profileData.role || user.app_metadata?.role || "admin",
              created_at:
                profileData.created_at ||
                user.created_at ||
                new Date().toISOString(),
              preferences: {
                emailNotifications: true,
                pushNotifications: false,
                darkMode: false,
                language: "English",
              },
            };
            setProfile(adminProfile);
          } else {
            setProfile(null);
          }
        } catch {
          setProfile(null);
        }
      } else {
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

  const isActive = (url: string) =>
    url === "/admin" ? pathname === "/admin" : pathname.startsWith(url.split("?")[0]);

  const displayName = profile?.full_name?.trim() || "Admin";
  const initials = profile?.full_name
    ? profile.full_name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  const { allowedTitles } = useRole();
  const visibleNav =
    allowedTitles.length === 0
      ? allNavItems
      : allNavItems.filter((i) => allowedTitles.includes(i.title));

  return (
    <Sidebar
      className="border-r-0"
      style={
        {
          "--sidebar": "#6B4423",
          "--sidebar-foreground": "#f5ede4",
          "--sidebar-border": "rgba(255,255,255,0.12)",
          "--sidebar-accent": "rgba(255,255,255,0.12)",
          "--sidebar-accent-foreground": "#ffffff",
          "--sidebar-primary": "#c9a961",
          "--sidebar-primary-foreground": "#6B4423",
          "--sidebar-ring": "#c9a961",
        } as React.CSSProperties
      }
    >
      {/* Logo */}
      <SidebarHeader className="p-6 border-b border-white/10">
        <Link
          href="/landing"
          className="flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Château Glow home"
        >
          <span className="text-xl font-bold tracking-tight text-white">
            Château Glow
          </span>
        </Link>
      </SidebarHeader>

      {/* Nav Items */}
      <SidebarContent className="px-3 py-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {visibleNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 font-medium transition-all duration-150",
                      "text-white/70 hover:text-white hover:bg-white/10",
                      "data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:shadow-sm",
                    )}
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

      {/* Footer — user profile */}
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
                    {mounted ? displayName : "Admin"}
                  </span>
                  <span className="text-xs text-white/50 truncate w-full">
                    {mounted && profile?.role === "admin"
                      ? "System Admin"
                      : "Staff"}
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
                {mounted ? displayName : "Admin"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {mounted ? user?.email : "admin@example.com"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/admin/profile"
                className="cursor-pointer flex items-center"
              >
                <UserIcon className="mr-2 h-4 w-4 text-[#6B4423]" />
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
