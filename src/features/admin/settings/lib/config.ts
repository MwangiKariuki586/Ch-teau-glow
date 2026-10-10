import type { SettingsCategory } from "../types"
import { getCurrencies, getPaymentMethods } from "./system-defaults"

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'email-templates',
    name: 'Email Templates',
    description: 'Manage email templates for customer communications',
    icon: 'Mail'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Configure notification preferences and alerts',
    icon: 'Bell'
  },
  {
    id: 'payments',
    name: 'Payment Settings',
    description: 'Configure payment processing and policies',
    icon: 'CreditCard'
  }
]

export const EMAIL_TEMPLATE_TYPES = [
  { value: 'booking_confirmation', label: 'Booking Confirmation' },
  { value: 'booking_reminder', label: 'Booking Reminder' },
  { value: 'booking_cancellation', label: 'Booking Cancellation' },
  { value: 'contact_response', label: 'Contact Response' },
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'password_reset', label: 'Password Reset' }
] as const

// Dynamic functions that fetch from system configuration
export const getPaymentMethodsConfig = getPaymentMethods
export const getCurrenciesConfig = getCurrencies

// Legacy exports for backward compatibility - these will be removed
export const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'google_pay', label: 'Google Pay' }
] as const

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'AED', label: 'UAE Dirham (د.إ)' }
] as const