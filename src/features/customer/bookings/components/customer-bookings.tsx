"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format, isAfter } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  type BookingStatus,
} from "@/lib/constants/booking-status";
import { CustomerBookingCard } from "./customer-booking-card";

export interface CustomerBookingItem {
  id: string;
  bookingKind: "service" | "package";
  bookingTitle: string;
  packageId: string | null;
  packageName: string | null;
  packageSlug: string | null;
  serviceId: string;
  branchId: string;
  specialistId: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  serviceName: string;
  serviceSlug: string | null;
  venueName: string;
  venueAddress: string | null;
  specialistName: string;
  specialistTitle: string | null;
  hasPendingChangeRequest: boolean;
}

interface CustomerBookingsProps {
  bookings: CustomerBookingItem[];
}

const cancelledStatuses = new Set<BookingStatus>(["cancelled", "rejected"]);
const completeStatuses = new Set<BookingStatus>(["completed", "no_show"]);

export function CustomerBookings({ bookings }: CustomerBookingsProps) {
  const [items, setItems] = useState<CustomerBookingItem[]>(bookings);

  useEffect(() => {
    setItems(bookings);
  }, [bookings]);

  const upcomingBookings = useMemo(
    () => {
      const now = new Date();
      return items.filter((booking) => {
        if (cancelledStatuses.has(booking.status)) return false;
        if (completeStatuses.has(booking.status)) return false;
        return isAfter(new Date(booking.startsAt), now);
      });
    },
    [items],
  );

  const cancelledBookings = useMemo(
    () => items.filter((booking) => cancelledStatuses.has(booking.status)),
    [items],
  );

  const pastBookings = useMemo(
    () => {
      const now = new Date();
      return items.filter((booking) => {
        if (cancelledStatuses.has(booking.status)) return false;
        if (completeStatuses.has(booking.status)) return true;
        return !isAfter(new Date(booking.startsAt), now);
      });
    },
    [items],
  );

  const handleBookingUpdated = (updated: {
    id: string;
    status: BookingStatus;
    starts_at: string;
    ends_at: string;
    notes: string | null;
  }) => {
    setItems((current) =>
      current.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              status: updated.status,
              startsAt: updated.starts_at,
              endsAt: updated.ends_at,
              notes: updated.notes,
            }
          : item,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Bookings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your service and package bookings
          </p>
        </div>
        <Button asChild>
          <Link href="/services">Book New Appointment</Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <div className="grid gap-4">
            {upcomingBookings.length === 0 && (
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No upcoming bookings yet.
                </CardContent>
              </Card>
            )}

            {upcomingBookings.map((booking) => (
              <CustomerBookingCard
                key={booking.id}
                booking={booking}
                onBookingUpdated={handleBookingUpdated}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <div className="grid gap-4">
            {pastBookings.length === 0 ? (
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No past bookings.
                </CardContent>
              </Card>
            ) : (
              pastBookings.map((booking) => (
                <CustomerBookingCard
                  key={booking.id}
                  booking={booking}
                  onBookingUpdated={handleBookingUpdated}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <div className="grid gap-4">
            {cancelledBookings.length === 0 ? (
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No cancelled bookings.
                </CardContent>
              </Card>
            ) : (
              cancelledBookings.map((booking) => (
                <CustomerBookingCard
                  key={booking.id}
                  booking={booking}
                  onBookingUpdated={handleBookingUpdated}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
