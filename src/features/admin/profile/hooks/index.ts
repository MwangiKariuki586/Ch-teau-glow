"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { getAdminProfile, updateAdminProfile, updateProfileAvatar } from '../api'
import type { AdminProfile, ProfileUpdateData } from '../types'

/**
 * Hook for managing admin profile data
 */
export function useAdminProfile() {
  const { user, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    if (!isAuthenticated || !user) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Use the same API endpoint as other components
      const response = await fetch('/api/profile')
      console.log('Admin Profile Hook - API response status:', response.status)
      
      if (response.ok) {
        const profileData = await response.json()
        console.log('Admin Profile Hook - Profile from API:', profileData)
        
        // Transform to match AdminProfile interface
        const adminProfile: AdminProfile = {
          id: profileData.id || user.id,
          email: profileData.email || user.email || '',
          full_name: profileData.first_name && profileData.last_name 
            ? `${profileData.first_name} ${profileData.last_name}`.trim()
            : profileData.first_name || profileData.last_name || user.email?.split('@')[0] || '',
          avatar_url: profileData.avatar_url || '',
          phone: profileData.phone || '',
          bio: profileData.bio || '',
          department: profileData.department || '',
          location: profileData.location || '',
          role: profileData.role || user.app_metadata?.role || 'admin',
          created_at: profileData.created_at || new Date().toISOString(),
          last_password_change: profileData.last_password_change || null,
          preferences: {
            language: profileData.preferences?.language || 'English',
            emailNotifications: profileData.preferences?.emailNotifications ?? true,
            pushNotifications: profileData.preferences?.pushNotifications ?? false,
            darkMode: profileData.preferences?.darkMode ?? false
          }
        }
        
        setProfile(adminProfile)
      } else {
        console.error('Admin Profile Hook - API response failed:', response.status)
        throw new Error('Failed to fetch profile from API')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile'
      setError(errorMessage)
      console.error('Admin Profile Hook - Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch profile when auth state changes
  useEffect(() => {
    fetchProfile()
  }, [user?.id, isAuthenticated])

  const updateProfile = async (updates: ProfileUpdateData) => {
    try {
      setError(null)
      const updatedProfile = await updateAdminProfile(updates)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const uploadAvatar = async (file: File) => {
    try {
      setError(null)
      const avatarUrl = await updateProfileAvatar(file)
      // Refresh profile to get updated data
      await fetchProfile()
      return avatarUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    refetch: fetchProfile
  }
}

/**
 * Hook for managing profile edit state
 */
export function useProfileEditor(initialProfile: AdminProfile | null) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<AdminProfile | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Only update editedProfile when initialProfile changes and we're not editing
  useEffect(() => {
    if (!isEditing) {
      setEditedProfile(initialProfile)
    }
    setHasChanges(false)
    setValidationErrors({})
  }, [initialProfile, isEditing])

  const startEditing = () => {
    setEditedProfile(initialProfile)
    setIsEditing(true)
    setHasChanges(false)
    setValidationErrors({})
  }

  const cancelEditing = () => {
    setEditedProfile(initialProfile)
    setIsEditing(false)
    setHasChanges(false)
    setValidationErrors({})
  }

  const updateField = <K extends keyof AdminProfile>(
    field: K,
    value: AdminProfile[K]
  ) => {
    if (!editedProfile) return

    const updated = { ...editedProfile, [field]: value }
    setEditedProfile(updated)
    setHasChanges(true)
    
    // Clear validation error for this field
    if (validationErrors[field as string]) {
      setValidationErrors(prev => ({ ...prev, [field as string]: '' }))
    }
  }

  const updatePreference = <K extends keyof AdminProfile['preferences']>(
    key: K,
    value: AdminProfile['preferences'][K]
  ) => {
    if (!editedProfile) return

    const updated = {
      ...editedProfile,
      preferences: {
        ...editedProfile.preferences,
        [key]: value
      }
    }
    setEditedProfile(updated)
    setHasChanges(true)
  }

  const setFieldError = (field: string, error: string) => {
    setValidationErrors(prev => ({ ...prev, [field]: error }))
  }

  const clearFieldError = (field: string) => {
    setValidationErrors(prev => ({ ...prev, [field]: '' }))
  }

  return {
    isEditing,
    editedProfile,
    hasChanges,
    validationErrors,
    startEditing,
    cancelEditing,
    updateField,
    updatePreference,
    setIsEditing,
    setFieldError,
    clearFieldError
  }
}

/**
 * Hook for managing notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'success' | 'error'
    message: string
  }>>([])

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(2, 11)
    setNotifications(prev => [...prev, { id, type, message }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const showSuccess = (message: string) => addNotification('success', message)
  const showError = (message: string) => addNotification('error', message)

  return {
    notifications,
    showSuccess,
    showError,
    removeNotification
  }
}
