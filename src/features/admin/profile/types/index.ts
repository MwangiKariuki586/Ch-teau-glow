import type { User } from '@supabase/supabase-js'

/**
 * Admin Profile interface based on Supabase Auth User
 * Maps to auth.users table fields and user_metadata
 */
export interface AdminProfile {
  id: string
  email: string
  full_name: string
  phone: string
  role: 'admin' | 'customer'
  created_at: string
  avatar_url?: string
  last_password_change?: string
  // Additional metadata fields
  bio?: string
  department?: string
  location?: string
  preferences: {
    emailNotifications: boolean
    pushNotifications: boolean
    darkMode: boolean
    language: string
  }
}

/**
 * Profile update payload
 */
export interface ProfileUpdateData {
  full_name?: string
  phone?: string
  avatar_url?: string
  bio?: string
  department?: string
  location?: string
  preferences?: Partial<AdminProfile['preferences']>
}

/**
 * Transform Supabase User to AdminProfile
 */
export function transformUserToProfile(user: User): AdminProfile {
  return {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || '',
    phone: user.user_metadata?.phone || '',
    role: user.app_metadata?.role || 'customer',
    created_at: user.created_at,
    avatar_url: user.user_metadata?.avatar_url,
    last_password_change: user.user_metadata?.last_password_change,
    bio: user.user_metadata?.bio,
    department: user.user_metadata?.department,
    location: user.user_metadata?.location,
    preferences: {
      emailNotifications: user.user_metadata?.preferences?.emailNotifications ?? true,
      pushNotifications: user.user_metadata?.preferences?.pushNotifications ?? false,
      darkMode: user.user_metadata?.preferences?.darkMode ?? false,
      language: user.user_metadata?.preferences?.language ?? 'English'
    }
  }
}