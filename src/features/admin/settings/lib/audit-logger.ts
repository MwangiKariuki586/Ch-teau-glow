// Audit logging for admin settings changes
import { createClient } from '@/lib/supabase/client'

export interface AuditLogEntry {
  id?: string
  user_id: string
  user_email: string
  action: 'create' | 'update' | 'delete'
  resource_type: 'email_template' | 'notification_settings' | 'payment_settings'
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  timestamp: string
  ip_address?: string
  user_agent?: string
}

export class AuditLogger {
  private supabase = createClient()

  async logChange(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      }

      // Store in Supabase audit_logs table
      const { error } = await this.supabase
        .from('audit_logs')
        .insert(auditEntry)

      if (error) {
        console.error('Failed to log audit entry:', error)
      }
    } catch (error) {
      console.error('Audit logging error:', error)
    }
  }

  async logEmailTemplateChange(
    action: 'create' | 'update' | 'delete',
    templateId: string,
    oldValues?: any,
    newValues?: any
  ) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    await this.logChange({
      user_id: user.id,
      user_email: user.email || '',
      action,
      resource_type: 'email_template',
      resource_id: templateId,
      old_values: oldValues,
      new_values: newValues
    })
  }

  async logNotificationSettingsChange(
    oldValues?: any,
    newValues?: any
  ) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    await this.logChange({
      user_id: user.id,
      user_email: user.email || '',
      action: 'update',
      resource_type: 'notification_settings',
      old_values: oldValues,
      new_values: newValues
    })
  }

  async logPaymentSettingsChange(
    oldValues?: any,
    newValues?: any
  ) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return

    await this.logChange({
      user_id: user.id,
      user_email: user.email || '',
      action: 'update',
      resource_type: 'payment_settings',
      old_values: oldValues,
      new_values: newValues
    })
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('/api/client-ip')
      const data = await response.json()
      return data.ip || 'unknown'
    } catch {
      return 'unknown'
    }
  }
}

export const auditLogger = new AuditLogger()