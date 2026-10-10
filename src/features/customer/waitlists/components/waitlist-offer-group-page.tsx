"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";
import { AlertCircle, ArrowLeft, Clock3 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { WaitlistOfferGroupDetails } from "@/lib/waitlist/server";

function CountdownPill({ expiresAt, expired }: { expiresAt: string; expired: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (expired) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expired]);

  if (expired) {
    return <Badge variant="secondary">Expired</Badge>;
  }

  const expiry = new Date(expiresAt).getTime();
  const remaining = Math.max(0, expiry - now);
  const minutes = String(Math.floor(remaining / 60_000)).padStart(2, "0");
  const seconds = String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0");

  return (
    <Badge className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 hover:bg-amber-100">
      Expires in {minutes}:{seconds}
    </Badge>
  );
}

export function WaitlistOfferGroupPage({
  details,
  failedSlotId,
}: {
  details: WaitlistOfferGroupDetails;
  failedSlotId?: string | null;
}) {
  const router = useRouter();
  const expired = details.group.status !== "offered";
  const availableSlots = details.slots.filter((slot) => slot.status === "offered");
  const allUnavailable = expired || availableSlots.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Waitlist offer
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose the time that works best. We re-check availability when you continue.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/customer/waitlists">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to waitlists
          </Link>
        </Button>
      </div>

      <Card className="rounded-3xl border-border/60 shadow-sm">
        <CardContent className="space-y-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{details.service.name}</p>
              <p className="text-sm text-muted-foreground">{details.branch.name}</p>
            </div>
            <CountdownPill expiresAt={details.group.offer_expires_at} expired={expired} />
          </div>
          <p className="text-sm text-muted-foreground">
            {details.slots.length} specialist-driven option
            {details.slots.length === 1 ? "" : "s"} found for this waitlist request.
          </p>
        </CardContent>
      </Card>

      <Drawer
        open
        direction="right"
        onOpenChange={(open) => {
          if (!open) {
            router.push("/customer/waitlists");
          }
        }}
      >
        <DrawerContent className="sm:max-w-xl">
          <DrawerHeader className="border-b border-border/40 pb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DrawerTitle className="text-xl">Choose a slot</DrawerTitle>
                <DrawerDescription className="mt-1">
                  {details.service.name} at {details.branch.name}
                </DrawerDescription>
              </div>
              <CountdownPill expiresAt={details.group.offer_expires_at} expired={expired} />
            </div>
          </DrawerHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {failedSlotId ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">That slot was just taken.</p>
                  <p className="mt-1 text-amber-900">
                    The remaining options below are still available to try.
                  </p>
                </div>
              </div>
            ) : null}

            {allUnavailable ? (
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {expired ? "This offer has expired." : "These slots are no longer available."}
                </p>
                <p className="mt-2">
                  We will keep your request on the waitlist unless you cancel it.
                </p>
                <div className="mt-4">
                  <Button asChild className="rounded-xl">
                    <Link href="/customer/waitlists">Keep me on the waitlist</Link>
                  </Button>
                </div>
              </div>
            ) : (
              details.slots.map((slot) => {
                const disabled =
                  expired ||
                  slot.status !== "offered" ||
                  (failedSlotId ? slot.id === failedSlotId : false);

                return (
                  <div
                    key={slot.id}
                    className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">
                          {format(new Date(slot.starts_at), "EEE, MMM d")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(slot.starts_at), "h:mm a")} -{" "}
                          {format(new Date(slot.ends_at), "h:mm a")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {slot.specialist.name}
                          {slot.specialist.title ? ` · ${slot.specialist.title}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>
                            Opened {formatDistanceToNowStrict(new Date(details.group.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {disabled ? (
                          <Button disabled className="rounded-xl">
                            Unavailable
                          </Button>
                        ) : (
                          <Button asChild className="rounded-xl">
                            <Link
                              href={`/book?waitlist_offer_group=${encodeURIComponent(details.group.id)}&waitlist_slot=${encodeURIComponent(slot.id)}`}
                            >
                              Select
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
