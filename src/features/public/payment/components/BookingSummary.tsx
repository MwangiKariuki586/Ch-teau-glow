/**
 * BookingSummary component
 * Displays booking details before payment
 */

import { format } from "date-fns";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { BookingSummaryProps } from "../types";

export function BookingSummary({
  service,
  branch,
  specialist,
  selectedSlot,
  amount,
  currency,
  baseAmount,
  discountAmount,
  validationMessage,
  packageSummary,
  appliedOffer,
}: BookingSummaryProps) {
  const isPackageBooking = Boolean(packageSummary);
  const intakeService = packageSummary?.entryService ?? service;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount / 100);
  const formattedBaseAmount =
    typeof baseAmount === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(baseAmount / 100)
      : null;
  const formattedDiscountAmount =
    typeof discountAmount === "number" && discountAmount > 0
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(discountAmount / 100)
      : null;

  const formattedDate = format(
    new Date(selectedSlot.starts_at),
    "EEEE, MMMM d, yyyy",
  );
  const formattedTime = format(new Date(selectedSlot.starts_at), "h:mm a");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isPackageBooking ? "Package Summary" : "Booking Summary"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">
                {isPackageBooking ? packageSummary?.name ?? service.name : service.name}
              </p>
              {isPackageBooking ? (
                <p className="text-sm text-muted-foreground">
                  Intake service: {intakeService.name}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {service.duration_minutes} minutes
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{specialist.name}</p>
              <p className="text-sm text-muted-foreground">
                {specialist.title}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{branch.name}</p>
              <p className="text-sm text-muted-foreground">
                {branch.address}, {branch.city}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{formattedTime}</p>
            </div>
          </div>
        </div>

        <Separator />

        {packageSummary && packageSummary.includedServices.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-[#C9A96E]/30 bg-[#FFF8EE] px-4 py-4 text-[#6B4423]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B4423]/70">
                Package Booking
              </p>
              <p className="font-semibold">{packageSummary.name}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Package inclusions:</p>
              <ul className="space-y-1 text-sm">
                {packageSummary.includedServices.map((includedService) => (
                  <li key={includedService.id}>
                    {includedService.quantity > 1
                      ? `${includedService.quantity}x ${includedService.name}`
                      : includedService.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {formattedBaseAmount && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              {isPackageBooking ? "Package price" : "Original price"}
            </p>
            <p className="font-medium">{formattedBaseAmount}</p>
          </div>
        )}

        {formattedDiscountAmount && (
          <div className="flex items-center justify-between text-sm text-emerald-700">
            <p className="font-medium">
              Discount{appliedOffer?.code ? ` (${appliedOffer.code})` : ""}
            </p>
            <p className="font-semibold">- {formattedDiscountAmount}</p>
          </div>
        )}

        {validationMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {validationMessage}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">
            {isPackageBooking ? "Package total" : "Total"}
          </p>
          <p className="text-2xl font-bold">{formattedAmount}</p>
        </div>
      </CardContent>
    </Card>
  );
}
