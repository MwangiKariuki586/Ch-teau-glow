"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, MoreVertical, Loader2 } from "lucide-react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomerWaitlistRequestItem } from "../lib/customer-waitlists-data";

function formatWindowLabel(value: CustomerWaitlistRequestItem["timeWindow"]) {
  if (!value) return "Any time";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type SpecialistOption = {
  id: string;
  name: string;
  title: string;
};

function AdjustPreferencesDialog({
  request,
}: {
  request: CustomerWaitlistRequestItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rangeDays, setRangeDays] = useState(() => {
    const inclusive =
      differenceInCalendarDays(
        new Date(`${request.dateTo}T12:00:00Z`),
        new Date(`${request.dateFrom}T12:00:00Z`),
      ) + 1;
    return inclusive <= 7 ? "7" : inclusive <= 14 ? "14" : "30";
  });
  const [timeWindow, setTimeWindow] = useState<string>(
    request.timeWindow ?? "any",
  );
  const [preferredSpecialist, setPreferredSpecialist] = useState<string>("any");
  const [specialists, setSpecialists] = useState<SpecialistOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const load = async () => {
      try {
        // We need service_id and branch_id from the request
        // For now, we'll skip loading specialists since we don't have those IDs
        // This would need to be added to the CustomerWaitlistRequestItem type
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed loading specialists for waitlist preferences:",
            error,
          );
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const start = new Date(`${request.dateFrom}T12:00:00Z`);
      const dateTo = format(
        addDays(start, Number(rangeDays) - 1),
        "yyyy-MM-dd",
      );

      toast.info("We're finding new times…");
      setOpen(false);

      const response = await fetch(
        `/api/waitlist/requests/${encodeURIComponent(request.id)}/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date_from: request.dateFrom,
            date_to: dateTo,
            time_window: timeWindow === "any" ? null : timeWindow,
            preferred_specialist_id:
              preferredSpecialist === "any" ? null : preferredSpecialist,
            cancelled_reason: "preferences_changed",
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to update waitlist preferences.",
        );
      }

      const { notification_id, offer_group_id, no_slots_reason } = result.data;

      if (!offer_group_id) {
        const msg =
          no_slots_reason === "no_specialists"
            ? "No specialists are available for this service right now."
            : no_slots_reason === "request_inactive"
              ? "Your waitlist request is no longer active."
              : "No new slots match your preferences yet. We'll notify you when one opens.";
        toast.info(msg);
        return;
      }

      toast.success("Preferences updated — opening new times…");

      if (notification_id) {
        router.push(`/notifications/${encodeURIComponent(notification_id)}`);
      } else {
        router.push(`/waitlist/offers/${encodeURIComponent(offer_group_id)}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update waitlist preferences.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={() => setOpen(true)}
      >
        Adjust preferences
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust waitlist preferences</DialogTitle>
          <DialogDescription>
            Update the range, time window, or specialist preference. We'll find
            new slots immediately and open them in a fresh notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date range</Label>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time of day</Label>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger>
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Specialist preference</Label>
            <Select
              value={preferredSpecialist}
              onValueChange={setPreferredSpecialist}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any specialist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any specialist</SelectItem>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    {specialist.name}
                    {specialist.title ? ` - ${specialist.title}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding times…
              </>
            ) : (
              "Save & find new times"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type GroupedRequest = {
  serviceName: string;
  branchName: string;
  requests: CustomerWaitlistRequestItem[];
};

function groupRequests(
  requests: CustomerWaitlistRequestItem[],
): GroupedRequest[] {
  const groups = new Map<string, GroupedRequest>();

  for (const request of requests) {
    const key = `${request.serviceName}|${request.branchName}`;
    const existing = groups.get(key);

    if (existing) {
      existing.requests.push(request);
    } else {
      groups.set(key, {
        serviceName: request.serviceName,
        branchName: request.branchName,
        requests: [request],
      });
    }
  }

  return Array.from(groups.values());
}

function RequestRow({
  request,
  onCancel,
  isPending,
}: {
  request: CustomerWaitlistRequestItem;
  onCancel: (id: string) => void;
  isPending: boolean;
}) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {request.serviceName}
            </p>
            <p className="text-xs text-muted-foreground">
              {request.branchName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {request.dateFrom} to {request.dateTo}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {formatWindowLabel(request.timeWindow)}
            </Badge>
            {request.preferredSpecialistName && (
              <Badge variant="secondary" className="text-xs">
                {request.preferredSpecialistName}
              </Badge>
            )}
            {request.status === "active" && (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {request.status === "active" && (
            <>
              <AdjustPreferencesDialog request={request} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={isPending}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowCancelDialog(true)}
                    className="text-destructive"
                  >
                    Cancel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this waitlist request?</DialogTitle>
            <DialogDescription>
              You'll stop receiving alerts for this preference.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCancelDialog(false)}
              disabled={isPending}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onCancel(request.id);
                setShowCancelDialog(false);
              }}
              disabled={isPending}
            >
              Cancel request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RequestGroup({
  group,
  onCancel,
  isPending,
}: {
  group: GroupedRequest;
  onCancel: (id: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(group.requests.length === 1);

  if (group.requests.length === 1) {
    return (
      <RequestRow
        request={group.requests[0]}
        onCancel={onCancel}
        isPending={isPending}
      />
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-background p-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {group.serviceName} • {group.branchName}
          </p>
          <p className="text-xs text-muted-foreground">
            {group.requests.length} requests
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 pl-4">
          {group.requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              onCancel={onCancel}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ActiveRequestsSection({
  requests,
  onCancel,
  isPending,
}: {
  requests: CustomerWaitlistRequestItem[];
  onCancel: (id: string) => void;
  isPending: boolean;
}) {
  const activeRequests = requests.filter((r) => r.status === "active");
  const groups = groupRequests(activeRequests);

  if (activeRequests.length === 0) {
    return (
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Active requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have no active waitlist requests.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Active requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group, index) => (
          <RequestGroup
            key={`${group.serviceName}-${group.branchName}-${index}`}
            group={group}
            onCancel={onCancel}
            isPending={isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}
