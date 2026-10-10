import { Check, Minus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { plans } from "@/lib/plans/catalog";

const comparisonRows = [
  {
    label: "Booking priority",
    values: { starter: "Selected windows before general release", radiance: "Earlier access with smoother slot coverage", luxury: "First-priority access on newly opened slots" },
  },
  {
    label: "Consultation access",
    values: { starter: "1 complimentary monthly consultation", radiance: "1 premium monthly consultation", luxury: "Premium consultation plus selected add-on access" },
  },
  {
    label: "Product and aftercare value",
    values: { starter: "5% off selected items", radiance: "8% off selected items and eligible services", luxury: "10% off selected items and eligible services" },
  },
  {
    label: "Offers and package access",
    values: { starter: "Advance notice on selected offers and packages", radiance: "Early access to curated packages and launches", luxury: "First access to premium packages and limited campaigns" },
  },
  {
    label: "Support level",
    values: { starter: "Member reminders and plan updates", radiance: "Faster rescheduling", luxury: "Concierge-style support" },
  },
  {
    label: "Birthday perk level",
    values: { starter: "Eligible birthday booking or order perk", radiance: "Stronger birthday perk plus rebooking value", luxury: "Elevated birthday perk with VIP moments" },
  },
];

function renderValue(value: boolean | string) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
        <Check className="h-4 w-4" /> Included
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Minus className="h-4 w-4" /> Not included
      </span>
    );
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

export function CompareTable() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[220px] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Benefit
              </TableHead>
              {plans.map((plan) => (
                <TableHead key={plan.slug} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {plan.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonRows.map((row) => (
              <TableRow key={row.label} className="border-border hover:bg-muted/30">
                <TableCell className="px-6 py-4 text-sm font-medium">{row.label}</TableCell>
                {plans.map((plan) => (
                  <TableCell key={plan.slug} className="px-6 py-4">
                    {renderValue(row.values[plan.slug])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
