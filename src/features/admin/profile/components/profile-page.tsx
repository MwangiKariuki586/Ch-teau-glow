"use client"

import * as React from "react"
import { Loader2, AlertCircle, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTheme } from "next-themes"
import { useAdminProfile, useProfileEditor, useNotifications } from "../hooks"
import { ProfileHeader } from "./profile-header"
import { ProfileInformationCard } from "./profile-information-card"
import { PasswordChangeCard } from "./password-change-card"
import { NotificationToast } from "./notification-toast"
import type { ProfileUpdateData, AdminProfile } from "../types"

export function ProfilePage() {
  const { profile, loading, error, updateProfile, uploadAvatar } = useAdminProfile()
  const {
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
  } = useProfileEditor(profile)
  const { notifications, showSuccess, showError, removeNotification } = useNotifications()
  const { setTheme } = useTheme()

  // Sync theme with user's dark mode preference
  React.useEffect(() => {
    if (profile?.preferences?.darkMode !== undefined) {
      setTheme(profile.preferences.darkMode ? 'dark' : 'light')
    }
  }, [profile?.preferences?.darkMode, setTheme])

  const [saving, setSaving] = React.useState(false)
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)

  const handleSave = async () => {
    if (!editedProfile || !profile) return

    try {
      setSaving(true)
      
      const updates: ProfileUpdateData = {}
      
      if (editedProfile.full_name !== profile.full_name) {
        updates.full_name = editedProfile.full_name
      }
      if (editedProfile.phone !== profile.phone) {
        updates.phone = editedProfile.phone
      }
      if (editedProfile.bio !== profile.bio) {
        updates.bio = editedProfile.bio
      }
      if (editedProfile.department !== profile.department) {
        updates.department = editedProfile.department
      }
      if (editedProfile.location !== profile.location) {
        updates.location = editedProfile.location
      }
      
      // Check if preferences changed
      const preferencesChanged = Object.keys(editedProfile.preferences).some(
        key => editedProfile.preferences[key as keyof typeof editedProfile.preferences] !== 
               profile.preferences[key as keyof typeof profile.preferences]
      )
      
      if (preferencesChanged) {
        updates.preferences = editedProfile.preferences
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(updates)
        showSuccess('Profile updated successfully!')
      }
      
      setIsEditing(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      showError(errorMessage)
      
      // Handle validation errors
      if (errorMessage.includes('Validation failed')) {
        // Parse validation errors and set field-specific errors
        if (errorMessage.includes('Full name')) {
          setFieldError('full_name', 'Please enter a valid full name')
        }
        if (errorMessage.includes('phone')) {
          setFieldError('phone', 'Please enter a valid phone number')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploadingAvatar(true)
      await uploadAvatar(file)
      showSuccess('Avatar updated successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar'
      showError(errorMessage)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handlePreferenceChange = (key: keyof NonNullable<typeof profile>['preferences'], value: boolean | string) => {
    if (isEditing) {
      updatePreference(key, value)
    } else {
      // For immediate preference updates when not in edit mode
      updateProfile({ preferences: { [key]: value } })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!profile) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No profile data available</AlertDescription>
      </Alert>
    )
  }

  const currentProfile = isEditing && editedProfile ? editedProfile : profile

  return (
    <>
      <div className="space-y-4">
        {/* Profile Header */}
        <ProfileHeader
          isEditing={isEditing}
          hasChanges={hasChanges}
          saving={saving}
          onEdit={startEditing}
          onSave={handleSave}
          onCancel={cancelEditing}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {/* Profile Information Card */}
          <div className="md:col-span-1">
            <ProfileInformationCard
              profile={currentProfile}
              isEditing={isEditing}
              uploadingAvatar={uploadingAvatar}
              onAvatarUpload={handleAvatarUpload}
            />
          </div>

          {/* Profile Details */}
          <div className="md:col-span-2 space-y-4">
            {/* Personal Information */}
            <Card className="shadow-sm border">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b py-3">
                <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
                <CardDescription className="text-sm">
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      Full Name
                      <span className="text-destructive">*</span>
                    </Label>
                    {isEditing ? (
                      <div className="relative">
                        <Input
                          id="name"
                          value={editedProfile?.full_name || ''}
                          onChange={(e) => {
                            updateField('full_name', e.target.value)
                            clearFieldError('full_name')
                          }}
                          className={`h-11 transition-all duration-200 ${
                            validationErrors.full_name 
                              ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
                              : "focus:border-primary focus:ring-primary/20"
                          } hover:border-muted-foreground focus:ring-2`}
                          placeholder="Enter your full name"
                        />
                        {validationErrors.full_name && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-11 px-4 py-2 bg-muted border rounded-lg text-sm flex items-center font-medium hover:bg-muted/80 transition-colors">
                        {currentProfile.full_name}
                      </div>
                    )}
                    {validationErrors.full_name && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.full_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      Email Address
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        Read-only
                      </span>
                    </Label>
                    <div className="h-11 px-4 py-2 bg-muted border rounded-lg text-sm flex items-center text-muted-foreground cursor-not-allowed">
                      {currentProfile.email}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Email cannot be changed for security reasons
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <div className="relative">
                        <Input
                          id="phone"
                          type="tel"
                          value={editedProfile?.phone || ''}
                          onChange={(e) => {
                            updateField('phone', e.target.value)
                            clearFieldError('phone')
                          }}
                          className={`h-11 transition-all duration-200 ${
                            validationErrors.phone 
                              ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
                              : "focus:border-primary focus:ring-primary/20"
                          } hover:border-muted-foreground focus:ring-2`}
                          placeholder="+1 (555) 123-4567"
                        />
                        {validationErrors.phone && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-11 px-4 py-2 bg-muted border rounded-lg text-sm flex items-center hover:bg-muted/80 transition-colors">
                        {currentProfile.phone || (
                          <span className="text-muted-foreground italic">Not provided</span>
                        )}
                      </div>
                    )}
                    {validationErrors.phone && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="location" className="text-sm font-medium">
                      Location
                    </Label>
                    {isEditing ? (
                      <Input
                        id="location"
                        value={editedProfile?.location || ''}
                        onChange={(e) => updateField('location', e.target.value)}
                        className="h-11 focus:border-primary focus:ring-primary/20 hover:border-muted-foreground focus:ring-2 transition-all duration-200"
                        placeholder="City, Country"
                      />
                    ) : (
                      <div className="h-11 px-4 py-2 bg-muted border rounded-lg text-sm flex items-center hover:bg-muted/80 transition-colors">
                        {currentProfile.location || (
                          <span className="text-muted-foreground italic">Not provided</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department
                    </Label>
                    {isEditing ? (
                      <Input
                        id="department"
                        value={editedProfile?.department || ''}
                        onChange={(e) => updateField('department', e.target.value)}
                        className="h-11 focus:border-primary focus:ring-primary/20 hover:border-muted-foreground focus:ring-2 transition-all duration-200"
                        placeholder="Engineering, Marketing, etc."
                      />
                    ) : (
                      <div className="h-11 px-4 py-2 bg-muted border rounded-lg text-sm flex items-center hover:bg-muted/80 transition-colors">
                        {currentProfile.department || (
                          <span className="text-muted-foreground italic">Not provided</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Label htmlFor="bio" className="text-sm font-medium">
                    Bio
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <Textarea
                        id="bio"
                        rows={4}
                        value={editedProfile?.bio || ''}
                        onChange={(e) => updateField('bio', e.target.value)}
                        placeholder="Tell us about yourself, your role, and what you do..."
                        className="focus:border-primary focus:ring-primary/20 hover:border-muted-foreground focus:ring-2 transition-all duration-200 resize-none"
                        maxLength={500}
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                        {(editedProfile?.bio || '').length}/500
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[100px] px-4 py-3 bg-muted border rounded-lg text-sm hover:bg-muted/80 transition-colors whitespace-pre-wrap">
                      {currentProfile.bio || (
                        <span className="text-muted-foreground italic">No bio provided</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security & Preferences */}
            <Card className="shadow-sm border">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b py-3">
                <CardTitle className="text-base font-semibold">Security & Preferences</CardTitle>
                <CardDescription className="text-sm">
                  Manage your account security and application preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Security Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium mb-2">Security</h4>
                    
                    {/* Email Verification - Compact */}
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md border">
                      <div className="flex-1">
                        <p className="text-xs font-medium">Email Status</p>
                        <p className="text-xs text-muted-foreground">Verified and secure</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-xs px-2 py-0.5">
                        Verified
                      </Badge>
                    </div>
                    
                    {/* Password Change - Compact with Dialog */}
                    <div className="py-2 px-3 bg-muted rounded-md border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-xs font-medium">Password</p>
                          <p className="text-xs text-muted-foreground">Last changed: {currentProfile.last_password_change ? new Date(currentProfile.last_password_change).toLocaleDateString() : 'Never'}</p>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs h-7"
                          >
                            Change Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Shield className="h-5 w-5" />
                              Change Password
                            </DialogTitle>
                            <DialogDescription>
                              Update your password to keep your account secure
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <PasswordChangeCard />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Preferences Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium mb-2">Preferences</h4>
                    
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md border">
                      <div className="flex-1">
                        <p className="text-xs font-medium">Email Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive updates via email</p>
                      </div>
                      <Switch
                        checked={currentProfile.preferences?.emailNotifications ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                        disabled={saving}
                        className="data-[state=checked]:bg-primary scale-75"
                      />
                    </div>

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md border">
                      <div className="flex-1">
                        <p className="text-xs font-medium">Push Notifications</p>
                        <p className="text-xs text-muted-foreground">Browser notifications</p>
                      </div>
                      <Switch
                        checked={currentProfile.preferences?.pushNotifications ?? false}
                        onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                        disabled={saving}
                        className="data-[state=checked]:bg-primary scale-75"
                      />
                    </div>

                    {/* Dark Mode */}
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md border">
                      <div className="flex-1">
                        <p className="text-xs font-medium">Dark Mode</p>
                        <p className="text-xs text-muted-foreground">Switch to dark theme</p>
                      </div>
                      <Switch
                        checked={currentProfile.preferences?.darkMode ?? false}
                        onCheckedChange={(checked) => handlePreferenceChange('darkMode', checked)}
                        disabled={saving}
                        className="data-[state=checked]:bg-primary scale-75"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>

        {/* Notifications */}
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            type={notification.type}
            message={notification.message}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </>
  )
}