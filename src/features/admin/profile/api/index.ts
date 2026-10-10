import { createClient } from '@/lib/supabase/client'
import type { AdminProfile, ProfileUpdateData } from '../types'
import { transformUserToProfile } from '../types'
import { profileUpdateSchema } from '../lib/validation'
import { logProfileUpdate } from '../lib/audit'

/**
 * Get current admin profile
 */
export async function getAdminProfile(): Promise<AdminProfile> {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new Error(`Failed to get user: ${error.message}`)
  }
  
  if (!user) {
    throw new Error('No authenticated user found')
  }
  
  // Verify user is admin
  if (user.app_metadata?.role !== 'admin') {
    throw new Error('Access denied: Admin role required')
  }
  
  // Debug: Log the user data from profile API
  console.log('Profile API - User data:', {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name,
    user_metadata: user.user_metadata
  })
  
  const profile = transformUserToProfile(user)
  console.log('Profile API - Transformed profile:', {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name
  })
  
  return profile
}

/**
 * Update admin profile
 */
export async function updateAdminProfile(updates: ProfileUpdateData): Promise<AdminProfile> {
  const supabase = createClient()
  
  // Validate input data
  const validation = profileUpdateSchema.safeParse(updates)
  if (!validation.success) {
    const errorMessages = validation.error.issues.map(issue => issue.message).join(', ')
    throw new Error(`Validation failed: ${errorMessages}`)
  }
  
  const validatedUpdates = validation.data
  
  // Prepare user_metadata update
  const userMetadata: Record<string, any> = {}
  
  if (validatedUpdates.full_name !== undefined) userMetadata.full_name = validatedUpdates.full_name
  if (validatedUpdates.phone !== undefined) userMetadata.phone = validatedUpdates.phone
  if (validatedUpdates.bio !== undefined) userMetadata.bio = validatedUpdates.bio
  if (validatedUpdates.department !== undefined) userMetadata.department = validatedUpdates.department
  if (validatedUpdates.location !== undefined) userMetadata.location = validatedUpdates.location
  
  // Handle preferences update
  if (validatedUpdates.preferences) {
    // Get current preferences first
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const currentPreferences = currentUser?.user_metadata?.preferences || {}
    
    userMetadata.preferences = {
      ...currentPreferences,
      ...validatedUpdates.preferences
    }
  }
  
  const { data, error } = await supabase.auth.updateUser({
    data: userMetadata
  })
  
  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }
  
  if (!data.user) {
    throw new Error('No user data returned after update')
  }
  
  // Log the profile update for audit trail
  await logProfileUpdate('profile_updated', {
    updated_fields: Object.keys(validatedUpdates),
    changes: validatedUpdates
  })
  
  return transformUserToProfile(data.user)
}

/**
 * Update profile avatar
 */
export async function updateProfileAvatar(file: File): Promise<string> {
  const supabase = createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('User not authenticated')
  }
  
  // Generate unique filename - use folder structure that matches RLS policies
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${user.id}/${fileName}` // This matches the RLS policy structure
  
  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })
  
  if (uploadError) {
    throw new Error(`Failed to upload avatar: ${uploadError.message}`)
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)
  
  // Update user metadata with new avatar URL
  await updateAdminProfile({ avatar_url: publicUrl })
  
  // Log avatar upload for audit trail
  await logProfileUpdate('avatar_uploaded', {
    file_name: fileName,
    file_size: file.size,
    file_type: file.type
  })
  
  return publicUrl
}