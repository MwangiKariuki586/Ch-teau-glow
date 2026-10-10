export interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'contact_response' | 'welcome' | 'password_reset'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationSettings {
  email_notifications: boolean
  sms_notifications: boolean
  push_notifications: boolean
  booking_notifications: boolean
  contact_enquiry_alerts: boolean
  newsletter_notifications: boolean
  system_alerts: boolean
  marketing_emails: boolean
  reminder_notifications: boolean
}

export interface PaymentSettings {
  stripe_public_key: string
  stripe_secret_key: string
  payment_methods: ('card' | 'apple_pay' | 'google_pay')[]
  currency: string
  require_deposit: boolean
  deposit_percentage: number
  refund_policy_days: number
  auto_capture: boolean
}

export interface SettingsCategory {
  id: string
  name: string
  description: string
  icon: string
}

export type SettingsData = {
  email_templates: EmailTemplate[]
  notifications: NotificationSettings
  payments: PaymentSettings
}