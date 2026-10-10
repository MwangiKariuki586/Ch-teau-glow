"use client"
import {
    Calendar, Activity, ShieldAlert, Users, Plus, Play, FileText,
    Clock, UserCheck, ClipboardList, Coffee, User, CheckCircle2,
    Star, ArrowRight
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/context"
import { useState, useEffect } from "react"
import { getAdminProfile } from "@/features/admin/profile/api"
import type { AdminProfile } from "@/features/admin/profile/types"
import { useDashboardData } from "../hooks/use-dashboard-data"
import { createClient } from "@/lib/supabase/client"
import { useRole } from "@/features/admin/shared/context/role-context"

// ── Types ──────────────────────────────────────────────────────────────────

type Role = "Admin" | "Branch Manager" | "Practitioner" | "Concierge"
type AppointmentStatus = "Completed" | "In Progress" | "Confirmed"
interface KPI { label: string; value: string; icon: React.ElementType; trend: string; color: string; bg: string; href: string }
interface QuickAction { label: string; desc: string; icon: React.ElementType; href: string }
interface ActivityItem { id: number; type: "booking" | "completion" | "alert"; text: string; time: string }

// ── Static Data ────────────────────────────────────────────────────────────

const activities: ActivityItem[] = [
    { id: 1, type: "booking",    text: "New booking: Lash Lift for Emma W. at 3:00 PM",         time: "10 mins ago" },
    { id: 2, type: "completion", text: "Service completed: Brow Lamination by Elena R.",         time: "25 mins ago" },
    { id: 3, type: "alert",      text: "Client complaint logged: Scheduling Error (Case #1042)", time: "1 hour ago"  },
]

const kpisByRole: Record<Role, KPI[]> = {
    "Admin": [
        { label: "Today's Appointments", value: "42",    icon: Calendar,    trend: "+4 from yesterday",  color: "text-blue-600",   bg: "bg-blue-50",   href: "/admin/bookings"        },
        { label: "Active Services",       value: "8",     icon: Activity,    trend: "3 waiting in queue", color: "text-emerald-600",bg: "bg-emerald-50",href: "/admin/analytics"       },
        { label: "Pending Recovery",      value: "2",     icon: ShieldAlert, trend: "1 critical case",    color: "text-rose-600",   bg: "bg-rose-50",   href: "/admin/recovery-center" },
        { label: "Staff On Duty",         value: "12",    icon: Users,       trend: "85% utilization",    color: "text-amber-600",  bg: "bg-amber-50",  href: "/admin/specialists"     },
    ],
    "Branch Manager": [
        { label: "Today's Appointments", value: "42",    icon: Calendar,    trend: "+4 from yesterday",  color: "text-blue-600",   bg: "bg-blue-50",   href: "/admin/bookings"        },
        { label: "Active Services",       value: "8",     icon: Activity,    trend: "3 waiting in queue", color: "text-emerald-600",bg: "bg-emerald-50",href: "/admin/analytics"       },
        { label: "Pending Recovery",      value: "2",     icon: ShieldAlert, trend: "1 critical case",    color: "text-rose-600",   bg: "bg-rose-50",   href: "/admin/recovery-center" },
        { label: "Staff On Duty",         value: "12",    icon: Users,       trend: "85% utilization",    color: "text-amber-600",  bg: "bg-amber-50",  href: "/admin/specialists"     },
    ],
    "Practitioner": [
        { label: "My Appointments", value: "6",   icon: Calendar,     trend: "2 remaining", color: "text-blue-600",   bg: "bg-blue-50",   href: "/admin/bookings" },
        { label: "Completed",       value: "3",   icon: CheckCircle2, trend: "On schedule", color: "text-emerald-600",bg: "bg-emerald-50",href: "/admin/bookings" },
        { label: "In Progress",     value: "1",   icon: Activity,     trend: "HydraFacial", color: "text-amber-600",  bg: "bg-amber-50",  href: "/admin/analytics"},
        { label: "Rating",          value: "4.9", icon: Star,         trend: "Top 10%",     color: "text-[#C9A96E]",  bg: "bg-amber-50",  href: "/admin/profile"  },
    ],
    "Concierge": [
        { label: "Walk-ins Today", value: "4",     icon: Users,    trend: "+2 vs avg",         color: "text-blue-600",   bg: "bg-blue-50",   href: "/admin/bookings"       },
        { label: "Bookings Made",  value: "18",    icon: Calendar, trend: "High volume",        color: "text-emerald-600",bg: "bg-emerald-50",href: "/admin/bookings"       },
        { label: "Queue Length",   value: "2",     icon: Clock,    trend: "Manageable",         color: "text-amber-600",  bg: "bg-amber-50",  href: "/admin/analytics"      },
        { label: "Avg Wait",       value: "8 min", icon: Activity, trend: "+3 min over target", color: "text-rose-600",   bg: "bg-rose-50",   href: "/admin/branch-cockpit" },
    ],
}

const quickActionsByRole: Record<Role, QuickAction[]> = {
    "Admin": [
        { label: "New Booking",   desc: "Create an appointment",  icon: Plus,     href: "/admin/bookings/new" },
        { label: "Walk-in",       desc: "Register a walk-in",     icon: Users,    href: "/admin/walk-in"      },
        { label: "Start Service", desc: "Begin a queued service",  icon: Play,     href: "/admin/bookings"     },
        { label: "Reports",       desc: "Branch analytics",        icon: FileText, href: "/admin/analytics"    },
    ],
    "Branch Manager": [
        { label: "New Booking",   desc: "Create an appointment",  icon: Plus,          href: "/admin/bookings/new"    },        { label: "Walk-in",       desc: "Register a walk-in",     icon: Users,         href: "/admin/walk-in"         },
        { label: "Start Service", desc: "Begin a queued service",  icon: Play,          href: "/admin/bookings"         },
        { label: "Reports",       desc: "Branch analytics",        icon: FileText,      href: "/admin/analytics"       },
    ],
    "Practitioner": [
        { label: "Start Service", desc: "Begin a queued service",  icon: Play,          href: "/admin/bookings"   },
        { label: "View Client",   desc: "Client records & history",icon: User,          href: "/admin/customers"  },
        { label: "My Schedule",   desc: "View your shifts",        icon: Calendar,      href: "/admin/profile"    },
        { label: "Break Request", desc: "Request a break",         icon: Coffee,        href: "/admin"            },
    ],
    "Concierge": [
        { label: "New Booking",     desc: "Create an appointment",  icon: Plus,          href: "/admin/bookings/new" },
        { label: "Walk-in",         desc: "Register a walk-in",     icon: Users,         href: "/admin/walk-in"      },
        { label: "Check-in Client", desc: "Confirm client arrival", icon: UserCheck,     href: "/admin/analytics"    },
        { label: "View Queue",      desc: "See current queue",      icon: ClipboardList, href: "/admin/analytics"    },
    ],
}

const statusStyles: Record<AppointmentStatus, string> = {
    "Completed":   "bg-emerald-100 text-emerald-800",
    "In Progress": "bg-amber-100 text-amber-800",
    "Confirmed":   "bg-blue-100 text-blue-800",
}

const activityDot: Record<ActivityItem["type"], string> = {
    booking:    "bg-blue-500",
    completion: "bg-emerald-500",
    alert:      "bg-rose-500",
}

// ── Component ──────────────────────────────────────────────────────────────

export function DashboardOverview() {
    const { user, isAuthenticated } = useAuth()
    const [profile, setProfile] = useState<any>(null)
    const [profileLoading, setProfileLoading] = useState(true)
    const supabase = createClient()
    
    // Fetch real dashboard data
    const { stats, appointments, loading: dashboardLoading, error } = useDashboardData()

    // Fetch real user profile data from API endpoint instead of auth metadata
    useEffect(() => {
        const fetchProfile = async () => {
            if (isAuthenticated && user) {
                try {
                    const response = await fetch('/api/profile')
                    console.log('Admin Dashboard - API response status:', response.status)
                    
                    if (response.ok) {
                        const profileData = await response.json()
                        console.log('Admin Dashboard - Profile from API:', profileData)
                        setProfile(profileData)
                    } else {
                        console.error('Admin Dashboard - API response failed:', response.status)
                        throw new Error('Failed to fetch profile')
                    }
                } catch (error) {
                    console.error('Failed to fetch admin profile for dashboard:', error)
                } finally {
                    setProfileLoading(false)
                }
            } else {
                setProfileLoading(false)
            }
        }

        fetchProfile()
    }, [user?.id, isAuthenticated])

    // Get user's first name from database profile only, no auth metadata fallback
    const firstName = profile?.first_name || 'Admin'
    const greeting = `Good morning, ${firstName}`
    
    const { role, setRole } = useRole()

    // Role switcher — front-end only (removed local useState)

    // Get base KPIs structure and update with real data
    const baseKpis = kpisByRole[role]
    const kpis = stats ? [
        { ...baseKpis[0], value: stats.todayAppointments.toString(), trend: `${stats.todayAppointments} scheduled today` },
        { ...baseKpis[1], value: stats.activeServices.toString(), trend: `${stats.activeServices} published services` },
        { ...baseKpis[2], value: "2", trend: "1 critical case" }, // Keep placeholder for pending recovery
        { ...baseKpis[3], value: stats.staffOnDuty.toString(), trend: `${stats.staffOnDuty} specialists active` },
    ] : baseKpis

    const actions = quickActionsByRole[role]

    if (profileLoading || dashboardLoading) {
        return (
            <div className="space-y-8" style={{ fontFamily: "Inter, sans-serif" }}>
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-8" style={{ fontFamily: "Inter, sans-serif" }}>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{greeting}</h2>
                        <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening at Château Glow Dubai Mall today.</p>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">Failed to load dashboard data. Please refresh the page.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 sm:space-y-8" style={{ fontFamily: "Inter, sans-serif" }}>

            {/* Greeting + role tabs */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{greeting}</h2>
                    <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening at Château Glow Dubai Mall today.</p>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm overflow-x-auto shrink-0 max-w-full">
                    {(["Admin", "Branch Manager", "Practitioner", "Concierge"] as Role[]).map(r => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={cn(
                                "rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0",
                                role === r
                                    ? "bg-[#3E2723] text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-800"
                            )}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {kpis.map((kpi, i) => (
                    <Link key={`${role}-${i}`} href={kpi.href}>
                        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100 cursor-pointer hover:border-[#C9A96E]/50 transition-all group"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)" }}>
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <div className={cn("p-2 sm:p-3 rounded-lg transition-colors group-hover:bg-[#C9A96E]/20", kpi.bg)}>
                                    <kpi.icon className={cn("w-4 h-4 sm:w-6 sm:h-6", kpi.color)} />
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#C9A96E] group-hover:translate-x-0.5 transition-all hidden sm:block" />
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{kpi.value}</h3>
                            <p className="text-xs sm:text-sm font-medium text-gray-600 leading-tight">{kpi.label}</p>
                            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2 leading-tight">{kpi.trend}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Schedule + right column */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                {/* Today's Schedule */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden"
                    style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)" }}>
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Today&apos;s Schedule</h3>
                        <Link href="/admin/bookings"
                            className="text-sm text-[#C9A96E] font-medium hover:text-[#B39358] transition-colors flex items-center gap-1">
                            View All <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {appointments && appointments.length > 0 ? (
                            appointments.map((apt) => (
                                <div key={apt.id}
                                    className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-[#FFF8F0]/60 transition-colors cursor-pointer">
                                    {/* Mobile: stacked layout */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <span className="text-xs font-medium text-gray-500 w-16 shrink-0 pt-0.5">{apt.time}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{apt.clientName}</p>
                                                <p className="text-xs text-gray-500 truncate">{apt.serviceName} · {apt.practitionerName}</p>
                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 sm:hidden">
                                                    <Clock className="w-3 h-3" />{apt.duration}m
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium",
                                                statusStyles[apt.status]
                                            )}>
                                                {apt.status}
                                            </span>
                                            <span className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
                                                <Clock className="w-3 h-3" />{apt.duration}m
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <p className="text-sm text-gray-500">No appointments scheduled for today</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column */}
                <div className="space-y-6 sm:space-y-8">

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6"
                        style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)" }}>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            {actions.map((action, i) => (
                                <Link key={`${role}-action-${i}`} href={action.href}>
                                    <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-[#C9A96E] hover:bg-[#FFF8F0] transition-all cursor-pointer group active:scale-95">
                                        <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-hover:text-[#C9A96E] mb-1.5 sm:mb-2 transition-colors" />
                                        <span className="text-[11px] sm:text-xs font-semibold text-gray-700 group-hover:text-[#3E2723] text-center leading-tight">{action.label}</span>
                                        <span className="text-[10px] text-gray-400 mt-0.5 group-hover:text-gray-500 text-center leading-tight hidden sm:block">{action.desc}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6"
                        style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)" }}>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                        <div className="space-y-3 sm:space-y-4">
                            {activities.map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", activityDot[item.type])} />
                                    <div className="min-w-0">
                                        <p className="text-xs sm:text-sm text-gray-800 leading-snug">{item.text}</p>
                                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
