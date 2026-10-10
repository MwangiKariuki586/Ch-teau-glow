"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type {
  EligibleServiceRecord,
  OfferSectionRecord,
} from "../lib/offers-data";
import { DiscountedServiceCard } from "./discounted-service-card";
import { buildOfferServicesHref } from "./offer-linking";

type DrawerResponse = {
  services: EligibleServiceRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
};

export function EligibleServicesDrawer({
  offer,
  triggerLabel,
  className,
}: {
  offer: OfferSectionRecord;
  triggerLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DrawerResponse>({
    services: [],
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0,
    query: "",
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: String(page),
          pageSize: "12",
        });
        if (query.trim()) {
          params.set("q", query.trim());
        }

        const response = await fetch(
          `/api/offers/${offer.id}/eligible-services?${params.toString()}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as DrawerResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load eligible services.");
        }

        setData(payload);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load eligible services.",
        );
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [offer.id, open, page, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPage(1);
    }
  }, [open]);

  const summaryLabel = useMemo(() => {
    if (loading) {
      return "Loading services";
    }

    return `${data.total} eligible service${data.total === 1 ? "" : "s"}`;
  }, [data.total, loading]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className={className}
        >
          {triggerLabel}
        </button>
      </DrawerTrigger>

      <DrawerContent className="max-h-[88vh] rounded-t-[28px] border-[#E7D7C8] bg-[#FCF8F4]">
        <DrawerHeader className="border-b border-[#E8DDD2] px-5 pb-4 pt-5 text-left sm:px-6 sm:pb-5 sm:pt-6">
          <DrawerTitle
            className="text-xl text-[#24140C] sm:text-2xl"
          >
            Eligible services for {offer.title}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-[#6D5A4C]">
            {summaryLabel}. Best eligible offer is applied at checkout.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-1 flex-col overflow-hidden px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="flex flex-col gap-3 border-b border-[#E8DDD2] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A7566]" />
              <Input
                value={query}
                onChange={(event) => {
                  setPage(1);
                  setQuery(event.target.value);
                }}
                placeholder="Search eligible services"
                className="h-11 rounded-full border-[#D8C7B8] bg-white pl-10 pr-4 text-sm"
              />
            </div>

            <Link
              href={buildOfferServicesHref(offer)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D8C7B8] px-5 text-sm font-semibold text-[#5C4432] transition-colors hover:bg-white"
            >
              Open full grid
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-5">
            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center text-[#6B5749]">
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Loading eligible services
              </div>
            ) : error ? (
              <div className="rounded-[24px] border border-dashed border-[#D7C6B2] bg-white px-6 py-14 text-center text-sm text-[#6B5749]">
                {error}
              </div>
            ) : data.services.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#D7C6B2] bg-white px-6 py-14 text-center text-sm text-[#6B5749]">
                No eligible services match this search yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {data.services.map((service) => (
                  <DiscountedServiceCard
                    key={service.id}
                    offer={offer}
                    service={service}
                  />
                ))}
              </div>
            )}
          </div>

          {data.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-[#E8DDD2] pt-4 text-sm text-[#6D5A4C]">
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={data.page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-full border border-[#D8C7B8] px-4 py-2 font-semibold text-[#5C4432] disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages || loading}
                  onClick={() =>
                    setPage((current) => Math.min(data.totalPages, current + 1))
                  }
                  className="rounded-full bg-[#6B4423] px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
