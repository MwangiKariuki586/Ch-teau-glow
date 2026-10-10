"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, isAfter } from "date-fns"
import type { User } from "@supabase/supabase-js"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Heart, Clock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CustomerBookingItem } from "@/features/customer/bookings"
import type { BookingStatus } from "@/lib/constants/booking-status"
import { useAuth } from "@/lib/auth/context"
import { createClient } from "@/lib/supabase/client"

import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

const cancelledStatuses = new Set<BookingStatus>(["cancelled", "rejected"])
const completeStatuses = new Set<BookingStatus>(["completed", "no_show"])

const statusClassMap: Record<BookingStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    rescheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
    no_show: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
}

function formatStatusLabel(status: BookingStatus) {
    return status.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase())
}

function bookingCode(id: string) {
    return `BK-${id.slice(0, 8).toUpperCase()}`
}

const chartConfig = {
    visits: {
        label: "Visits",
        color: "var(--color-primary)",
    },
} satisfies ChartConfig

interface CustomerDashboardOverviewProps {
    bookings: CustomerBookingItem[]
    user: User // Keep for fallback, but we'll use auth context primarily
}

export function CustomerDashboardOverview({ bookings, user: fallbackUser }: CustomerDashboardOverviewProps) {
    const router = useRouter()
    const now = new Date()
    const { user, isAuthenticated } = useAuth()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // Use auth context user if available, fallback to server-side user
    const currentUser = user || fallbackUser

    // Fetch real user profile data from API endpoint
    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser) {
                try {
                    const response = await fetch('/api/profile');
                    if (response.ok) {
                        const profileData = await response.json();
                        console.log('Customer Dashboard - Profile from API:', profileData);
                        setProfile(profileData);
                    } else {
                        throw new Error('Failed to fetch profile');
                    }
                } catch (error) {
                    console.error('Failed to fetch user profile:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }

        fetchProfile()
    }, [currentUser?.id])

    const upcomingBookings = useMemo(
        () =>
            bookings
                .filter((booking) => {
                    if (cancelledStatuses.has(booking.status)) return false
                    if (completeStatuses.has(booking.status)) return false
                    return isAfter(new Date(booking.startsAt), now)
                })
                .slice(0, 2),
        [bookings, now]
    )

    const pastBookings = useMemo(
        () =>
            bookings
                .filter((booking) => {
                    if (cancelledStatuses.has(booking.status)) return false
                    if (completeStatuses.has(booking.status)) return true
                    return !isAfter(new Date(booking.startsAt), now)
                })
                .slice(0, 3),
        [bookings, now]
    )

    const totalVisits = useMemo(
        () => bookings.filter((b) => completeStatuses.has(b.status)).length,
        [bookings]
    )

    // Get user's real name from database profile, with fallbacks
    const firstName = profile 
        ? profile.first_name || currentUser?.email?.split("@")[0] || "there"
        : currentUser?.email?.split("@")[0] || "there"
    
    const userName = firstName

    if (loading) {
        return (
            <div className="flex flex-col gap-8 pb-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
            </div>
        )
    }
    return (
        <div className="flex flex-col gap-8 pb-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {userName}!</h1>
                <Button onClick={() => router.push("/services")}>Book Appointment</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Bookings</CardTitle>
                        <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-full">
                            <Calendar className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight mt-1">{upcomingBookings.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {upcomingBookings.length > 0
                                ? `Next appointment on ${format(new Date(upcomingBookings[0].startsAt), "MMM dd")}`
                                : "No upcoming appointments"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
                        <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-full">
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight mt-1">{totalVisits}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Completed appointments
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">All Bookings</CardTitle>
                        <div className="p-2.5 bg-pink-500/10 dark:bg-pink-500/20 rounded-full">
                            <Heart className="h-4 w-4 text-pink-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold tracking-tight mt-1">{bookings.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total booking history
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card className="shadow-sm border-border/50">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>
                            Manage your appointments and profile
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-4">
                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4 gap-2"
                                onClick={() => router.push("/services")}
                            >
                                <Calendar className="h-5 w-5 text-primary" />
                                <div className="text-left">
                                    <div className="font-semibold">Book Service</div>
                                    <div className="text-xs text-muted-foreground">Schedule new appointment</div>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4 gap-2"
                                onClick={() => router.push("/customer/bookings")}
                            >
                                <Clock className="h-5 w-5 text-primary" />
                                <div className="text-left">
                                    <div className="font-semibold">My Bookings</div>
                                    <div className="text-xs text-muted-foreground">View all appointments</div>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4 gap-2"
                                onClick={() => router.push("/customer/favorites")}
                            >
                                <Heart className="h-5 w-5 text-primary" />
                                <div className="text-left">
                                    <div className="font-semibold">My Favorites</div>
                                    <div className="text-xs text-muted-foreground">Saved services</div>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4 gap-2"
                                onClick={() => router.push("/customer/profile")}
                            >
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <div className="text-left">
                                    <div className="font-semibold">My Profile</div>
                                    <div className="text-xs text-muted-foreground">Update your information</div>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-sm border-border/50">
                    <CardHeader>
                        <CardTitle>Upcoming Appointments</CardTitle>
                        <CardDescription>
                            Your confirmed bookings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upcomingBookings.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No upcoming bookings yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcomingBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-start justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/customer/bookings/${booking.id}`)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                    {booking.bookingTitle.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">{booking.bookingTitle}</p>
                                                {booking.bookingKind === "package" ? (
                                                    <p className="text-xs text-muted-foreground">Intake service: {booking.serviceName}</p>
                                                ) : null}
                                                <p className="text-xs text-muted-foreground">{booking.venueName}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(booking.startsAt), "MMM dd, yyyy")} at{" "}
                                                    {format(new Date(booking.startsAt), "hh:mm a")}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={statusClassMap[booking.status] ?? ""}>
                                            {formatStatusLabel(booking.status)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                        {upcomingBookings.length > 0 && (
                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => router.push("/customer/bookings")}
                            >
                                View All Bookings
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/50">
                    <CardHeader>
                        <CardTitle>Recent Visits</CardTitle>
                        <CardDescription>
                            Your past appointments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pastBookings.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No past bookings yet.
                            </div>
                        ) : (
                            <div className="rounded-md border border-border/50 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Service</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pastBookings.map((booking) => (
                                            <TableRow
                                                key={booking.id}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => router.push(`/customer/bookings/${booking.id}`)}
                                            >
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{booking.bookingTitle}</span>
                                                        <span className="text-xs text-muted-foreground">{booking.venueName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {format(new Date(booking.startsAt), "MMM dd, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusClassMap[booking.status] ?? ""}>
                                                        {formatStatusLabel(booking.status)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
