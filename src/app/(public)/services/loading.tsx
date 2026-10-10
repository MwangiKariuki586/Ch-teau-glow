import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the Services marketplace page.
 * Mirrors the updated layout: hero bar, filter chips row, card grid.
 * Visual proportions match the new card aspect ratio (4:3 + content area).
 */
export default function ServicesLoading() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#faf9f7]">
      {/* Hero placeholder */}
      <div className="h-52 w-full bg-[#c5af94]/30" />

      {/* Search + chips bar */}
      <section className="border-b border-[#ede9e3] bg-[#faf9f7] px-6 pb-5 pt-7 sm:px-[55px]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          {/* Search row */}
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-full bg-[#ede9e3]" />
            <Skeleton className="h-11 w-24 rounded-full bg-[#ede9e3]" />
          </div>
          {/* Chips row */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full bg-[#ede9e3]" />
            ))}
          </div>
        </div>
      </section>

      {/* Cards grid */}
      <section className="px-6 py-14 sm:px-[55px]">
        {/* Section header */}
        <div className="mb-8 flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 rounded-lg bg-[#ede9e3]" />
            <Skeleton className="h-4 w-80 rounded-lg bg-[#ede9e3]" />
          </div>
          <Skeleton className="h-4 w-20 rounded-lg bg-[#ede9e3]" />
        </div>

        {/* Card grid — 4 cols on lg, matches live layout */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-[#ede9e3] bg-white shadow-sm"
            >
              {/* Image area (4:3) */}
              <Skeleton className="aspect-4/3 w-full bg-[#ede9e3]" />
              {/* Content area */}
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4 rounded bg-[#ede9e3]" />
                <Skeleton className="h-3 w-1/2 rounded bg-[#ede9e3]" />
                <Skeleton className="h-5 w-1/3 rounded bg-[#ede9e3]" />
                <Skeleton className="h-10 w-full rounded-full bg-[#ede9e3]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
