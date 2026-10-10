"use client";

import type { LucideIcon } from "lucide-react";
import {
  Braces,
  Camera,
  Globe,
  Handshake,
  MessageCircle,
  MoreHorizontal,
  Music,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingChannel } from "../lib/types";
import { formatBookingChannelLabel, normalizeBookingChannel } from "../lib/utils";

const channelMeta: Record<
  BookingChannel,
  {
    icon: LucideIcon;
    className: string;
  }
> = {
  web: {
    icon: Globe,
    className: "border-stone-200 bg-stone-100 text-stone-700",
  },
  admin: {
    icon: ShieldCheck,
    className: "border-[#C9A96E]/30 bg-[#FFF4E2] text-[#6B4423]",
  },
  phone: {
    icon: Phone,
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  whatsapp: {
    icon: MessageCircle,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  instagram: {
    icon: Camera,
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  tiktok: {
    icon: Music,
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  facebook: {
    icon: Users,
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  partner: {
    icon: Handshake,
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  api: {
    icon: Braces,
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  other: {
    icon: MoreHorizontal,
    className: "border-gray-200 bg-gray-100 text-gray-700",
  },
};

export function ChannelBadge(props: {
  channel: string | null | undefined;
  className?: string;
}) {
  const channel = normalizeBookingChannel(props.channel);
  const meta = channelMeta[channel];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        meta.className,
        props.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatBookingChannelLabel(channel)}
    </span>
  );
}
