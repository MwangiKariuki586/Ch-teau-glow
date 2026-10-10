import type { BookingStatus } from "@/lib/constants/booking-status";

export type CustomerBookingUiState =
  | "action_required"
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "rejected"
  | "no_show";

export function getCustomerBookingUiState(params: {
  status: BookingStatus;
  hasPendingChangeRequest: boolean;
}): CustomerBookingUiState {
  if (params.hasPendingChangeRequest) {
    return "action_required";
  }

  switch (params.status) {
    case "pending":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "rescheduled":
      return "rescheduled";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "rejected":
      return "rejected";
    case "no_show":
      return "no_show";
    default:
      return "pending";
  }
}

export function getCustomerBookingStatusBadge(params: {
  status: BookingStatus;
  hasPendingChangeRequest: boolean;
}) {
  return params.hasPendingChangeRequest
    ? "Action required"
    : params.status.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function getCustomerBookingNextStepText(state: CustomerBookingUiState) {
  switch (state) {
    case "action_required":
      return "Please confirm the new time.";
    case "pending":
      return "Awaiting confirmation from Château Glow.";
    case "confirmed":
      return "You're booked. Add to calendar or manage booking.";
    case "rescheduled":
      return "Your booking was rescheduled. Add to calendar.";
    case "completed":
      return "This booking is completed.";
    case "cancelled":
      return "This booking was cancelled.";
    case "rejected":
      return "This booking was not approved.";
    case "no_show":
      return "This booking is closed.";
    default:
      return "Check your booking details.";
  }
}

export function canShowCalendarAction(status: BookingStatus) {
  return status === "confirmed" || status === "rescheduled";
}

export function canShowCancelAction(params: {
  status: BookingStatus;
  hasPendingChangeRequest: boolean;
}) {
  if (params.hasPendingChangeRequest) {
    return false;
  }

  return ["pending", "confirmed", "rescheduled"].includes(params.status);
}
