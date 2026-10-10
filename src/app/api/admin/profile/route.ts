import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { profileUpdateSchema } from '@/features/admin/profile/lib/validation'
import { transformUserToProfile } from '@/features/admin/profile/types'

/**
 * GET /api/admin/profile
 * Get current admin profile
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Verify admin role
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied: Admin role required' },
        { status: 403 }
      )
    }
    
    // Use the centralized transformation function
    const profile = transformUserToProfile(user)
    
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/profile
 * Update admin profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Verify admin role
    if (user.app_metadata?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied: Admin role required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Validate input
    const validation = profileUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }
    
    const updates = validation.data
    
    // Prepare user_metadata update
    const userMetadata: Record<string, any> = {}
    
    if (updates.full_name !== undefined) userMetadata.full_name = updates.full_name
    if (updates.phone !== undefined) userMetadata.phone = updates.phone
    if (updates.bio !== undefined) userMetadata.bio = updates.bio
    if (updates.department !== undefined) userMetadata.department = updates.department
    if (updates.location !== undefined) userMetadata.location = updates.location
    
    // Handle preferences update
    if (updates.preferences) {
      const currentPreferences = user.user_metadata?.preferences || {}
      userMetadata.preferences = {
        ...currentPreferences,
        ...updates.preferences
      }
    }
    
    // Update user metadata
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: userMetadata
    })
    
    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 400 }
      )
    }
    
    if (!data.user) {
      return NextResponse.json(
        { error: 'No user data returned after update' },
        { status: 500 }
      )
    }
    
    // Use the centralized transformation function for updated profile
    const updatedProfile = transformUserToProfile(data.user)
    
    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile: updatedProfile 
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}