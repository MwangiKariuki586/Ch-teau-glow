"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface BranchOption {
  id: string;
  name: string;
  city: string;
  country: string;
}

interface ServicesFiltersDrawerProps {
  q?: string;
  category?: string;
  branch?: string;
  branches: BranchOption[];
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  featured?: boolean;
  discomfortLevel?: string;
  withSideEffects?: boolean;
}

function baseQueryString(params: { q?: string; category?: string }) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.category && params.category !== "all") {
    searchParams.set("category", params.category);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function ServicesFiltersDrawer({
  q,
  category,
  branch,
  branches,
  minPrice,
  maxPrice,
  minDuration,
  maxDuration,
  featured,
  discomfortLevel,
  withSideEffects,
}: ServicesFiltersDrawerProps) {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        {/*
         * Trigger pill — styled to match the category chips.
         * Behavior (opens drawer) is unchanged.
         */}
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[#ddd6cd] bg-white px-4 text-xs font-medium text-[#6b5745] transition hover:border-[#6B4423] hover:bg-[#fdf6ee] hover:text-[#6B4423] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B4423]/40"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>
      </DrawerTrigger>
      {/* Drawer — max-w and rounded unchanged; colors updated */}
      <DrawerContent className="h-dvh max-h-dvh w-full rounded-none bg-[#faf9f7] sm:max-w-md sm:rounded-l-2xl">
        <form action="/services" method="get" className="flex h-full flex-col">
          <DrawerHeader className="relative border-b border-[#ede9e3] bg-white pb-4 pr-14">
            <DrawerTitle className="text-base font-semibold text-gray-900">Filter Services</DrawerTitle>
            <DrawerClose asChild>
              <button
                type="button"
                aria-label="Close filters"
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ede9e3] text-[#9c8570] transition hover:bg-[#fdf6ee] hover:text-[#6B4423] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B4423]/30"
              >
                <X className="h-4 w-4" />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <input type="hidden" name="q" value={q ?? ""} />
          <input
            type="hidden"
            name="category"
            value={category && category !== "all" ? category : ""}
          />

          {/* Shared input style token — applied inline to keep each field clear */}
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">

            {/* Branch select */}
            <div className="space-y-2">
              <label htmlFor="branch" className="text-xs font-semibold uppercase tracking-wider text-[#9c8570]">
                Branch
              </label>
              <select
                id="branch"
                name="branch"
                defaultValue={branch && branch !== "all" ? branch : "all"}
                className="h-10 w-full rounded-xl border border-[#ddd6cd] bg-white px-3 text-sm text-gray-800 outline-none focus:border-[#6B4423] focus:ring-2 focus:ring-[#6B4423]/20"
              >
                <option value="all">All branches</option>
                {branches.map((branchOption) => (
                  <option key={branchOption.id} value={branchOption.id}>
                    {branchOption.name} ({branchOption.city}, {branchOption.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Price range (AED) */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9c8570]">Price (AED)</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="minPrice"
                  type="number"
                  min={0}
                  defaultValue={minPrice ?? ""}
                  placeholder="Min"
                  className="h-10 rounded-xl border border-[#ddd6cd] bg-white px-3 text-sm text-gray-800 outline-none placeholder:text-[#b8a899] focus:border-[#6B4423] focus:ring-2 focus:ring-[#6B4423]/20"
                />
                <input
                  name="maxPrice"
                  type="number"
                  min={0}
                  defaultValue={maxPrice ?? ""}
                  placeholder="Max"
                  className="h-10 rounded-xl border border-[#ddd6cd] bg-white px-3 text-sm text-gray-800 outline-none placeholder:text-[#b8a899] focus:border-[#6B4423] focus:ring-2 focus:ring-[#6B4423]/20"
                />
              </div>
            </div>

            {/* Duration range */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9c8570]">Duration (minutes)</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="minDuration"
                  type="number"
                  min={0}
                  defaultValue={minDuration ?? ""}
                  placeholder="Min"
                  className="h-10 rounded-xl border border-[#ddd6cd] bg-white px-3 text-sm text-gray-800 outline-none placeholder:text-[#b8a899] focus:border-[#6B4423] focus:ring-2 focus:ring-[#6B4423]/20"
                />
                <input
                  name="maxDuration"
                  type="number"
                  min={0}
                  defaultValue={maxDuration ?? ""}
                  placeholder="Max"
                  className="h-10 rounded-xl border border-[#ddd6cd] bg-white px-3 text-sm text-gray-800 outline-none placeholder:text-[#b8a899] focus:border-[#6B4423] focus:ring-2 focus:ring-[#6B4423]/20"
                />
              </div>
            </div>

            {/* Featured select */}
            <div className="space-y-2">
              <label htmlFor="featured" className="text-xs font-semibold uppercase tracking-wider text-[#9c8570]">
                Featured
              </label>
              <select
                id="featured"
                name="featured"
                defaultValue={featured ? "true" : "all"}
                className="h-10 w-full rounded-xl border border-[#ddd6cd] bg-white px-3 text-sm text-gray-800 outline-none focus:border-[#6B4423] focus:ring-2 focus:ring-[#6B4423]/20"
              >
                <option value="all">All services</option>
                <option value="true">Featured only</option>
              </select>
            </div>

            {/* Discomfort level select */}
            <div className="space-y-2">
              <label htmlFor="discomfortLevel" className="text-xs font-semibold uppercase tracking-wider text-[#9c8570]">
                Discomfort Level
              </label>
              <select
                id="discomfortLevel"
                name="discomfortLevel"
                defaultValue={discomfortLevel && discomfortLevel !== "all" ? discomfortLevel : "all"}
                className="h-10 w-full rounded-xl border border-[#ddd6cd] bg-white px-3 text-sm text-gray-800 outline-none focus:border-[#6B4423] focus:ring-2 focus:ring-[#6B4423]/20"
              >
                <option value="all">Any level</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>

            {/* Side-effects checkbox */}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#ede9e3] bg-white p-4 text-sm text-gray-700 transition hover:border-[#6B4423]/40 hover:bg-[#fdf6ee]">
              <input
                name="withSideEffects"
                type="checkbox"
                value="true"
                defaultChecked={withSideEffects}
                className="h-4 w-4 accent-[#6B4423]"
              />
              <span>Has side effects</span>
            </label>
          </div>

          <DrawerFooter className="border-t border-[#ede9e3] bg-white px-5 py-4">
            {/* Apply — cocoa primary */}
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-[#6B4423] text-sm font-semibold text-white hover:bg-[#4A2C1A] focus-visible:ring-2 focus-visible:ring-[#6B4423]/50"
            >
              Apply Filters
            </Button>
            {/* Clear — warm outline (behavior unchanged) */}
            <Button
              asChild
              type="button"
              className="h-11 w-full rounded-full border border-[#ddd6cd] bg-transparent text-sm font-medium text-[#6b5745] hover:border-[#6B4423] hover:bg-[#fdf6ee] hover:text-[#6B4423] focus-visible:ring-2 focus-visible:ring-[#6B4423]/30"
            >
              <a href={`/services${baseQueryString({ q, category })}`}>Clear Filters</a>
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
