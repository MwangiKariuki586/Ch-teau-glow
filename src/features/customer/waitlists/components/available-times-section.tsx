"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerWaitlistOfferItem } from "../lib/customer-waitlists-data";

function OfferCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expires = new Date(expiresAt).getTime();
  if (expires <= now) {
    return <span>Expired</span>;
  }

  const remaining = expires - now;
  const minutes = String(Math.floor(remaining / 60_000)).padStart(2, "0");
  const seconds = String(Math.floor((remaining % 60_000) / 1000)).padStart(
    2,
    "0",
  );

  return (
    <span>
      Expires in {minutes}:{seconds}
    </span>
  );
}

export function AvailableTimesSection({
  offers,
}: {
  offers: CustomerWaitlistOfferItem[];
}) {
  if (offers.length === 0) {
    return (
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Available times (Action required)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No appointment times available right now. We'll notify you when new
            times open.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Available times (Action required)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {offers.map((offer) => (
          <div key={offer.id} className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {offer.serviceName} • {offer.branchName}
                </h3>
              </div>
            </div>

            {/* Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Choose a time
                </p>
                <p className="mt-1 text-xs text-emerald-900">
                  We'll confirm availability when you continue.
                </p>
              </div>
              <Badge className="rounded-full bg-white px-3 py-1 text-emerald-950 shadow-sm hover:bg-white">
                <OfferCountdown expiresAt={offer.offerExpiresAt} />
              </Badge>
            </div>

            {/* Slot rows (up to 5) */}
            <div className="space-y-2">
              {offer.slots.slice(0, 5).map((slot) => (
                <div
                  key={slot.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-3 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {format(new Date(slot.startsAt), "EEE, MMM d")} —{" "}
                      {format(new Date(slot.startsAt), "h:mm a")}–
                      {format(new Date(slot.endsAt), "h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slot.specialistName}
                    </p>
                  </div>
                  <Button asChild size="sm" className="rounded-xl">
                    <Link
                      href={`/waitlist/offers/${encodeURIComponent(offer.id)}`}
                    >
                      Choose
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            {/* View more footer */}
            {offer.slots.length > 5 && (
              <div className="flex justify-center pt-2">
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={`/waitlist/offers/${encodeURIComponent(offer.id)}`}
                  >
                    View {offer.slots.length - 5} more time
                    {offer.slots.length - 5 !== 1 ? "s" : ""}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
