"use client"

import { useState, useEffect } from "react"
import { 
  getPaymentSettings,
  updatePaymentSettings
} from "../api"
import { auditLogger } from "../lib/audit-logger"
import type { PaymentSettings } from "../types"

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPaymentSettings()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<PaymentSettings>) => {
    try {
      const oldSettings = settings
      const updated = await updatePaymentSettings(updates)
      setSettings(updated)
      
      // Log the change
      await auditLogger.logPaymentSettingsChange(oldSettings, updated)
      
      return updated
    } catch (err) {
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