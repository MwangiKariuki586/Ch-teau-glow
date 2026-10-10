import { ArrowLeftIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationDetailLoading() {
  return (
    <section className="w-full max-w-4xl">
      <div className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to notifications
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </CardContent>
      </Card>
    </section>
  );
}
