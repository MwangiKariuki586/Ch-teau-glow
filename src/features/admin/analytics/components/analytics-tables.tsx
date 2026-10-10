'use client';

import { MapPin, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RankedItem {
  name: string;
  count: number;
  revenue: number;
}

interface Props {
  topBranches: RankedItem[];
  topServices: RankedItem[];
  currency: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AnalyticsTables({ topBranches, topServices, currency }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <MapPin className="h-5 w-5 text-primary" />
          Top Performing Branches
        </h2>
        <div className="space-y-3">
          {topBranches.length > 0 ? (
            topBranches.map((branch, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-bold text-primary">{i + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{branch.name}</p>
                    <p className="text-sm text-muted-foreground">{branch.count} bookings</p>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(branch.revenue, currency)}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground">No branch data available</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          Top Services by Revenue
        </h2>
        <div className="space-y-3">
          {topServices.length > 0 ? (
            topServices.map((service, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{i + 1}</Badge>
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.count} bookings</p>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(service.revenue, currency)}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground">No service data available</p>
          )}
        </div>
      </Card>
    </div>
  );
}
