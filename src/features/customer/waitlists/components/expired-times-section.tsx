"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerWaitlistOfferItem } from "../lib/customer-waitlists-data";

function CheckNewTimesButton({
  requestId,
  disabled,
}: {
  requestId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!requestId) {
      toast.error("Unable to refresh — waitlist request info is missing.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/waitlist/requests/${encodeURIComponent(requestId)}/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancelled_reason: "rejoin" }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to find new times.");
      }

      const { notification_id, offer_group_id, no_slots_reason } = result.data;

      if (!offer_group_id) {
        const msg =
          no_slots_reason === "no_specialists"
            ? "No specialists are available for this service right now."
            : no_slots_reason === "request_inactive"
              ? "Your waitlist request is no longer active."
              : "No new slots are available yet. We'll notify you when one opens.";
        toast.info(msg);
        return;
      }

      toast.success("Found new times — opening now…");

      if (notification_id) {
        router.push(`/notifications/${encodeURIComponent(notification_id)}`);
      } else {
        router.push(`/waitlist/offers/${encodeURIComponent(offer_group_id)}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to find new times.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl"
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Finding times…
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Check new times
        </>
      )}
    </Button>
  );
}

export function ExpiredTimesSection({
  offers,
}: {
  offers: CustomerWaitlistOfferItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (offers.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle>Recently expired times</CardTitle>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These times are no longer available.
          </p>
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {offer.serviceName} • {offer.branchName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expired{" "}
                  {formatDistanceToNow(new Date(offer.offerExpiresAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <CheckNewTimesButton requestId={offer.waitlistRequestId} />
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
