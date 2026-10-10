"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { useNotificationSettings } from "../hooks/use-notification-settings"
import { SettingsSectionHeader } from "./settings-section-header"
import { SettingsCard } from "./settings-card"
import { SettingsToggle } from "./settings-toggle"
import { SettingsForm } from "./settings-form"

export function NotificationsSection() {
  const { settings, loading, updateSettings } = useNotificationSettings()
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)

  if (loading || !settings) {
    return <div className="flex items-center justify-center p-8">Loading notification settings...</div>
  }

  if (!localSettings) {
    setLocalSettings(settings)
    return null
  }

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    setLocalSettings(prev => prev ? { ...prev, [key]: value } : null)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!localSettings) return
    
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setLocalSettings(settings)
    setHasChanges(false)
  }

  return (
    <SettingsForm
      hasChanges={hasChanges}
      isSaving={isSaving}
      onSave={handleSave}
      onReset={handleReset}
      showAlert={true}
    >
      <SettingsSectionHeader
        title="Notification Settings"
        description="Configure how and when you receive notifications"
        icon={Bell}
      />

      <SettingsCard
        title="Communication Channels"
        description="Choose how you want to receive notifications"
      >
        <div className="space-y-4">
          <SettingsToggle
            id="email-notifications"
            label="Email Notifications"
            description="Receive notifications via email"
            checked={localSettings.email_notifications}
            onCheckedChange={(checked) => handleToggle('email_notifications', checked)}
            showSeparator={true}
          />
          
          <SettingsToggle
            id="sms-notifications"
            label="SMS Notifications"
            description="Receive notifications via SMS text messages"
            checked={localSettings.sms_notifications}
            onCheckedChange={(checked) => handleToggle('sms_notifications', checked)}
            showSeparator={true}
          />
          
          <SettingsToggle
            id="push-notifications"
            label="Push Notifications"
            description="Receive browser push notifications"
            checked={localSettings.push_notifications}
            onCheckedChange={(checked) => handleToggle('push_notifications', checked)}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Business Notifications"
        description="Configure business-specific notification types"
      >
        <div className="space-y-4">
          <SettingsToggle
            id="booking-notifications"
            label="Booking Notifications"
            description="Get notified about new bookings, changes, and cancellations"
            checked={localSettings.booking_notifications}
            onCheckedChange={(checked) => handleToggle('booking_notifications', checked)}
            showSeparator={true}
          />
          
          <SettingsToggle
            id="contact-enquiry-alerts"
            label="Contact Enquiry Alerts"
            description="Get notified when customers submit contact forms or enquiries"
            checked={localSettings.contact_enquiry_alerts}
            onCheckedChange={(checked) => handleToggle('contact_enquiry_alerts', checked)}
            showSeparator={true}
          />
          
          <SettingsToggle
            id="newsletter-notifications"
            label="Newsletter Notifications"
            description="Get notified about newsletter subscriptions and campaigns"
            checked={localSettings.newsletter_notifications}
            onCheckedChange={(checked) => handleToggle('newsletter_notifications', checked)}
            showSeparator={true}
          />
          
          <SettingsToggle
            id="system-alerts"
            label="System Alerts"
            description="Get notified about system updates, maintenance, and issues"
            checked={localSettings.system_alerts}
            onCheckedChange={(checked) => handleToggle('system_alerts', checked)}
            showSeparator={true}
          />
          
          <SettingsToggle
            id="reminder-notifications"
            label="Reminder Notifications"
            description="Send automatic reminders to customers about upcoming appointments"
            checked={localSettings.reminder_notifications}
            onCheckedChange={(checked) => handleToggle('reminder_notifications', checked)}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Marketing & Communication"
        description="Manage marketing and promotional notifications"
      >
        <div className="space-y-4">
          <SettingsToggle
            id="marketing-emails"
            label="Marketing Emails"
            description="Receive updates about new features, promotions, and company news"
            checked={localSettings.marketing_emails}
            onCheckedChange={(checked) => handleToggle('marketing_emails', checked)}
          />
        </div>
      </SettingsCard>
    </SettingsForm>
  )
}