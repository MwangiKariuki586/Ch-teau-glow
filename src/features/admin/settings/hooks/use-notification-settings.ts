"use client"

import { useState, useEffect } from "react"
import { 
  getNotificationSettings,
  updateNotificationSettings
} from "../api"
import { auditLogger } from "../lib/audit-logger"
import type { NotificationSettings } from "../types"

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getNotificationSettings()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    try {
      const oldSettings = settings
      
      // Optimistically update UI
      setSettings(prev => prev ? { ...prev, ...updates } : null)
      
      // Update on server
      await updateNotificationSettings(updates)
      
      // Log the change
      await auditLogger.logNotificationSettingsChange(oldSettings, { ...oldSettings, ...updates })
      
      return settings ? { ...settings, ...updates } : null
    } catch (err) {
      // Revert optimistic update on error
      await loadSettings()
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      throw err
    }
  }

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: loadSettings
  }
}