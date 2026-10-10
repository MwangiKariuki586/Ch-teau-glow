"use client"

import * as React from "react"
import { Camera, Phone, MapPin, Calendar, Shield, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { RoleBadge } from "./role-badge"
import type { AdminProfile } from "../types"

interface ProfileInformationCardProps {
  profile: AdminProfile
  isEditing: boolean
  uploadingAvatar: boolean
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export const ProfileInformationCard = React.memo(function ProfileInformationCard({
  profile,
  isEditing,
  uploadingAvatar,
  onAvatarUpload
}: ProfileInformationCardProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <Card className="shadow-sm border">
      <CardHeader className="text-center bg-gradient-to-b from-muted/50 to-background border-b py-4">
        <div className="relative mx-auto mb-3">
          <div className="relative">
            <Avatar className="h-24 w-24 mx-auto ring-2 ring-background shadow-md border">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-lg font-bold">
                {profile.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1">
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onAvatarUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200 border border-background"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <CardTitle className="text-lg font-semibold">{profile.full_name}</CardTitle>
          <p className="text-xs text-muted-foreground font-medium">{profile.email}</p>
          <div className="flex justify-center">
            <RoleBadge role={profile.role} className="shadow-sm text-xs" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
            <div className="flex-shrink-0">
              <Phone className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
              <p className="text-xs truncate">
                {profile.phone || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
            <div className="flex-shrink-0">
              <MapPin className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
              <p className="text-xs truncate">
                {profile.location || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
            <div className="flex-shrink-0">
              <Calendar className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member Since</p>
              <p className="text-xs">
                {new Date(profile.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {profile.department && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
              <div className="flex-shrink-0">
                <Shield className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</p>
                <p className="text-xs truncate">{profile.department}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-xs font-medium px-2 py-0.5">
              Active
            </Badge>
          </div>
          
          {/* Role & Access */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Role & Access</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0.5">
                {profile.role === 'admin' ? 'Administrator' : 'Customer'}
              </Badge>
              {profile.role === 'admin' && (
                <>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 text-xs px-1.5 py-0.5">
                    Full Access
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-xs px-1.5 py-0.5">
                    User Mgmt
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})