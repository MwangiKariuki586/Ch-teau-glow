"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Search } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NotificationPanel } from "@/features/admin/notifications"
import { useRealtimeNotifications } from "@/features/shared/notifications/hooks/use-realtime-notifications";

export function AdminHeader() {
    const pathname = usePathname()
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = React.useState(false)
    const {
        loading,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
    } = useRealtimeNotifications({ maxItems: 20, basePath: "/admin/notifications" });

    const generateBreadcrumbs = () => {
        const paths = pathname.split("/").filter((p) => p !== "")

        if (paths.length === 1 && paths[0] === "admin") {
            return (
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbPage className="text-foreground font-semibold">Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            )
        }

        return (
            <BreadcrumbList>
                {paths.map((path, index) => {
                    const href = `/${paths.slice(0, index + 1).join("/")}`
                    const isLast = index === paths.length - 1
                    const label = path.charAt(0).toUpperCase() + path.slice(1)

                    if (path === "admin") {
                        return (
                            <React.Fragment key={path}>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink asChild>
                                        <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors">
                                            Dashboard
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block text-muted-foreground/50" />
                            </React.Fragment>
                        )
                    }

                    return (
                        <React.Fragment key={path}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage className="text-foreground font-semibold">{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href} className="text-muted-foreground hover:text-primary transition-colors">
                                            {label}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator className="text-muted-foreground/50" />}
                        </React.Fragment>
                    )
                })}
            </BreadcrumbList>
        )
    }

    return (
        <>
            <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <SidebarTrigger className="h-9 w-9 shrink-0 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" />
                    <div className="h-5 w-px bg-border hidden md:block" />
                    <Breadcrumb className="hidden sm:block min-w-0">
                        {generateBreadcrumbs()}
                    </Breadcrumb>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <div className="relative hidden md:flex items-center">
                        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search clients, bookings..."
                            className="h-9 w-48 lg:w-64 rounded-xl border border-border bg-muted/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
                        />
                    </div>

                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsNotificationPanelOpen(true)}
                            className="h-9 w-9 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                        >
                            <Bell className="h-4 w-4" />
                            <span className="sr-only">Notifications</span>
                        </Button>
                        {unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 p-0 px-1 text-[10px] text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </Badge>
                        )}
                    </div>
                </div>
            </header>

            <NotificationPanel
                isOpen={isNotificationPanelOpen}
                onClose={() => setIsNotificationPanelOpen(false)}
                loading={loading}
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
            />
        </>
    )
}
