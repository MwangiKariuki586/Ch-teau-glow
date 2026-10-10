import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentStatus = "pending" | "succeeded" | "failed" | "canceled";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const statusConfig: Record<
  PaymentStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
  succeeded: {
    label: "Paid",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  },
  canceled: {
    label: "Canceled",
    icon: Ban,
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
  },
};

export function PaymentStatusBadge({
  status,
  className,
}: PaymentStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1",
        config.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
