import { Skeleton } from "@/components/ui/skeleton";

export default function ServiceDetailsLoading() {
  return (
    <main className="min-h-screen bg-background pt-28">
      <section className="px-4 sm:px-8 lg:px-[55px] pb-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <Skeleton className="h-8 w-40 rounded-full" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[280px] sm:h-[360px] w-full rounded-3xl" />
            <Skeleton className="h-[280px] sm:h-[360px] w-full rounded-3xl" />
          </div>
          <Skeleton className="h-[320px] w-full rounded-3xl" />
          <Skeleton className="h-[240px] w-full rounded-3xl" />
        </div>
      </section>
    </main>
  );
}
