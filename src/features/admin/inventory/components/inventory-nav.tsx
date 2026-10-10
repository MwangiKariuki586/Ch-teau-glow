"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Stock Directory", href: "/admin/inventory" },
  { label: "Transfers", href: "/admin/inventory/transfers" },
  { label: "Reconciliation", href: "/admin/inventory/reconciliation" },
  { label: "Expiry", href: "/admin/inventory/expiry" },
];

export function InventoryNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin/inventory"
      ? pathname === "/admin/inventory"
      : pathname.startsWith(href);

  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm overflow-x-auto w-fit">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0",
            isActive(item.href)
              ? "bg-[#3E2723] text-white shadow-sm"
              : "text-gray-500 hover:text-gray-800",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
