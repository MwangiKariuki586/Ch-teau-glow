"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AvailableTimesSection } from "./available-times-section";
import { ActiveRequestsSection } from "./active-requests-section";
import { ExpiredTimesSection } from "./expired-times-section";
import {
  WaitlistFilters,
  type FilterType,
  type SortType,
} from "./waitlist-filters";
import type {
  CustomerWaitlistOfferItem,
  CustomerWaitlistRequestItem,
} from "../lib/customer-waitlists-data";

export function CustomerWaitlistsPage({
  initialRequests,
  initialOffers,
}: {
  initialRequests: CustomerWaitlistRequestItem[];
  initialOffers: CustomerWaitlistOfferItem[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [offers, setOffers] = useState(initialOffers);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("expiring");

  // Separate active and expired offers
  const { activeOffers, expiredOffers } = useMemo(() => {
    const now = Date.now();
    const active: CustomerWaitlistOfferItem[] = [];
    const expired: CustomerWaitlistOfferItem[] = [];

    for (const offer of offers) {
      const expiresAt = new Date(offer.offerExpiresAt).getTime();
      if (
        offer.status === "offered" &&
        expiresAt > now &&
        offer.slots.some((s) => s.status === "offered")
      ) {
        active.push(offer);
      } else if (
        offer.status === "expired" ||
        offer.status === "cancelled" ||
        expiresAt <= now
      ) {
        expired.push(offer);
      }
    }

    return { activeOffers: active, expiredOffers: expired };
  }, [offers]);

  // Sort offers based on selected sort type
  const sortedActiveOffers = useMemo(() => {
    const sorted = [...activeOffers];
    switch (sort) {
      case "expiring":
        sorted.sort(
          (a, b) =>
            new Date(a.offerExpiresAt).getTime() -
            new Date(b.offerExpiresAt).getTime(),
        );
        break;
      case "newest":
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "branch":
        sorted.sort((a, b) => a.branchName.localeCompare(b.branchName));
        break;
    }
    return sorted;
  }, [activeOffers, sort]);

  const cancelRequest = async (id: string) => {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/waitlist/${id}`, {
            method: "DELETE",
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error ?? "Failed to cancel waitlist.");
          }

          setRequests((current) =>
            current.map((request) =>
              request.id === id ? { ...request, status: "cancelled" } : request,
            ),
          );
          toast.success("Waitlist cancelled.");
          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to cancel waitlist.",
          );
        }
      })();
    });
  };

  // Determine which sections to show based on filter
  const showAvailable = filter === "all" || filter === "available";
  const showActive = filter === "all" || filter === "active";
  const showExpired = filter === "all" || filter === "expired";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My Waitlists</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Active requests and available appointment times — we'll alert you as
          soon as new times open.
        </p>
      </div>

      <WaitlistFilters
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
      />

      {showAvailable && <AvailableTimesSection offers={sortedActiveOffers} />}

      {showActive && (
        <ActiveRequestsSection
          requests={requests}
          onCancel={cancelRequest}
          isPending={isPending}
        />
      )}

      {showExpired && <ExpiredTimesSection offers={expiredOffers} />}
    </div>
  );
}
