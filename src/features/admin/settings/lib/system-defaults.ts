// System defaults that can be configured dynamically
// These should eventually be moved to database configuration

export async function getSystemDefaults() {
  // In the future, this could fetch from a system_config table
  // For now, we'll use environment variables with fallbacks
  
  return {
    currencies: [
      { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
      { value: 'EUR', label: 'Euro (€)', symbol: '€' },
      { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
      { value: 'AED', label: 'UAE Dirham (د.إ)', symbol: 'د.إ' },
      { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
      { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
      { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
      { value: 'CHF', label: 'Swiss Franc (CHF)', symbol: 'CHF' },
      { value: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥' },
      { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' }
    ],
    paymentMethods: [
      { value: 'card', label: 'Credit/Debit Card' },
      { value: 'apple_pay', label: 'Apple Pay' },
      { value: 'google_pay', label: 'Google Pay' },
      { value: 'paypal', label: 'PayPal' },
      { value: 'bank_transfer', label: 'Bank Transfer' }
    ],
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
    defaultPaymentMethods: ['card'],
    defaultNotificationSettings: {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: false,
      booking_notifications: true,
      contact_enquiry_alerts: true,
      newsletter_notifications: false,
      system_alerts: true,
      marketing_emails: false,
      reminder_notifications: true
    },
    defaultPaymentSettings: {
      stripe_public_key: '',
      stripe_secret_key: '',
      payment_methods: ['card'],
      currency: process.env.DEFAULT_CURRENCY || 'USD',
      require_deposit: false,
      deposit_percentage: 0,
      refund_policy_days: parseInt(process.env.DEFAULT_REFUND_DAYS || '7'),
      auto_capture: false
    }
  }
}

export async function getCurrencies() {
  const defaults = await getSystemDefaults()
  return defaults.currencies
}

export async function getPaymentMethods() {
  const defaults = await getSystemDefaults()
  return defaults.paymentMethods
}