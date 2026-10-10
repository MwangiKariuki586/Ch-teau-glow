/**
 * Format payment amount from cents to currency string
 */
export function formatPaymentAmount(
  amountCents: number | null,
  currency: string | null,
): string {
  if (amountCents === null || currency === null) {
    return "N/A";
  }

  const amount = amountCents / 100;
  
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}
