"use client"

import { useState, useEffect } from "react"
import { 
  getEmailTemplates, 
  updateEmailTemplate,
  createEmailTemplate
} from "../api"
import { auditLogger } from "../lib/audit-logger"
import type { EmailTemplate } from "../types"

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getEmailTemplates()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const updateTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    try {
      const oldTemplate = templates.find(t => t.id === id)
      const updated = await updateEmailTemplate(id, updates)
      setTemplates(prev => prev.map(t => t.id === id ? updated : t))
      
      // Log the change
      await auditLogger.logEmailTemplateChange('update', id, oldTemplate, updated)
      
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template')
      throw err
    }
  }

  const createTemplate = async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const created = await createEmailTemplate(template)
      setTemplates(prev => [...prev, created])
      
      // Log the change
      await auditLogger.logEmailTemplateChange('create', created.id, null, created)
      
      return created
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
      throw err
    }
  }

  return {
    templates,
    loading,
    error,
    updateTemplate,
    createTemplate,
    refetch: loadTemplates
  }
}