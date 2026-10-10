'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Download, Mail, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { subscribeToTable, unsubscribe } from '@/lib/supabase/realtime';
import type { NewsletterSubscription } from '../types';

function exportCSV(subscriptions: NewsletterSubscription[]) {
  const headers = ['Email', 'Source', 'Status', 'Subscribed Date'];
  const rows = subscriptions.map((s) => [
    s.email,
    s.source ?? '',
    s.status,
    s.created_at ? format(new Date(s.created_at), 'yyyy-MM-dd HH:mm') : '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `newsletter-subscriptions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  unsubscribed: { label: 'Unsubscribed', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export function NewsletterSubscriptionsTab({
  subscriptions: initialSubscriptions,
}: {
  subscriptions: NewsletterSubscription[];
}) {
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>(initialSubscriptions);

  // Real-time: reflect new sign-ups and status changes without a page reload
  useEffect(() => {
    const channel = subscribeToTable<NewsletterSubscription>(
      'newsletter_subscriptions',
      ({ eventType, new: next, old }) => {
        setSubscriptions((prev) => {
          if (eventType === 'INSERT') return [next, ...prev];
          if (eventType === 'UPDATE') return prev.map((s) => (s.id === next.id ? next : s));
          if (eventType === 'DELETE') return prev.filter((s) => s.id !== (old as NewsletterSubscription).id);
          return prev;
        });
      }
    );
    return () => { unsubscribe(channel); };
  }, []);

  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const unsubCount = subscriptions.filter((s) => s.status !== 'active').length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
              <p className="text-3xl font-bold mt-1">{subscriptions.length}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{activeCount}</p>
            </div>
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Unsubscribed</p>
              <p className="text-3xl font-bold mt-1 text-muted-foreground">{unsubCount}</p>
            </div>
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table header with Export */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subscriber List</h3>
        <Button variant="outline" onClick={() => exportCSV(subscriptions)} disabled={subscriptions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscribed Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Mail className="h-12 w-12 text-muted-foreground/40" />
                      <p className="text-lg font-medium">No subscribers yet</p>
                      <p className="text-sm text-muted-foreground">Newsletter signups will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {s.source ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[s.status]?.className ?? ''}>
                        {statusConfig[s.status]?.label ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {s.created_at ? format(new Date(s.created_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {subscriptions.length > 0 && (
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            {activeCount} active · {unsubCount} unsubscribed · {subscriptions.length} total
          </div>
        )}
      </Card>
    </div>
  );
}
