import type { EmailTemplate, NotificationSettings, PaymentSettings } from "../types"

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const response = await fetch('/api/admin/settings/email-templates', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch email templates')
  }

  return response.json()
}

export async function updateEmailTemplate(id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const response = await fetch('/api/admin/settings/email-templates', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...template })
  })

  if (!response.ok) {
    throw new Error('Failed to update email template')
  }

  return response.json()
}

export async function createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> {
  const response = await fetch('/api/admin/settings/email-templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(template)
  })

  if (!response.ok) {
    throw new Error('Failed to create email template')
  }

  return response.json()
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await fetch('/api/admin/settings/notifications', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch notification settings')
  }

  return response.json()
}

export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const response = await fetch('/api/admin/settings/notifications', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings)
  })

  if (!response.ok) {
    throw new Error('Failed to update notification settings')
  }

  return response.json()
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const response = await fetch('/api/admin/settings/payments', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch payment settings')
  }

  return response.json()
}

export async function updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<PaymentSettings> {
  const response = await fetch('/api/admin/settings/payments', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings)
  })

  if (!response.ok) {
    throw new Error('Failed to update payment settings')
  }

  return response.json()
}