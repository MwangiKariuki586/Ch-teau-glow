/**
 * Payment feature type definitions
 */

export type PaymentStatus = "pending" | "succeeded" | "failed" | "canceled";

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface Specialist {
  id: string;
  name: string;
  title: string;
  image_url: string | null;
}

export interface SelectedSlot {
  starts_at: string;
  ends_at: string;
}

export interface PackageIncludedServiceSummary {
  id: string;
  name: string;
  quantity: number;
}

export interface PackageEntryServiceSummary {
  id: string;
  name: string;
  duration_minutes: number;
}

export interface PackageBookingSummary {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  entryService: PackageEntryServiceSummary | null;
  includedServices: PackageIncludedServiceSummary[];
}

export interface PaymentStepProps {
  service: Service;
  branch: Branch;
  specialist: Specialist;
  selectedSlot: SelectedSlot;
  packageId?: string | null;
  offerId?: string | null;
  code?: string | null;
  waitlistOfferId?: string | null;
  waitlistOfferGroupId?: string | null;
  waitlistNotificationId?: string | null;
  packageSummary?: PackageBookingSummary | null;
  onPaymentSuccess: (bookingId: string) => void;
  onBack: () => void;
}

export interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isCreatingBooking?: boolean;
}

export interface BookingSummaryProps {
  service: Service;
  branch: Branch;
  specialist: Specialist;
  selectedSlot: SelectedSlot;
  amount: number;
  currency: string;
  baseAmount?: number | null;
  discountAmount?: number | null;
  validationMessage?: string | null;
  packageSummary?: PackageBookingSummary | null;
  appliedOffer?: {
    title: string;
    code: string | null;
  } | null;
}

export interface PaymentIntentParams {
  service_id: string;
  branch_id: string;
  specialist_id: string;
  starts_at: string;
  package_id?: string;
  offer_id?: string;
  code?: string;
}

export interface PaymentIntentOfferSummary {
  id: string;
  title: string;
  code: string | null;
  offer_type: "percent_off" | "fixed_credit" | "free_gift" | "other";
  value_numeric: number | null;
}

export interface PaymentIntentResponse {
  client_secret: string;
  amount_cents: number;
  currency: string;
  base_amount_minor: number;
  discount_amount_minor: number;
  final_amount_minor: number;
  applied_offer: PaymentIntentOfferSummary | null;
  applied_package: {
    id: string;
    name: string;
    slug: string;
    price_cents: number;
    currency: string;
  } | null;
  booking_kind: "service" | "package";
  validation_status: "none" | "applied" | "invalid";
  validation_message: string | null;
}
