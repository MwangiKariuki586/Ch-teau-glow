"use client"

import { Edit, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProfileHeaderProps {
  isEditing: boolean
  hasChanges: boolean
  saving: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}

export function ProfileHeader({
  isEditing,
  hasChanges,
  saving,
  onEdit,
  onSave,
  onCancel
}: ProfileHeaderProps) {
  return (
    <div className="bg-card border rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account information and preferences</p>
        </div>
        {!isEditing ? (
          <Button 
            onClick={onEdit} 
            className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button 
              onClick={onSave} 
              disabled={saving || !hasChanges}
              className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
            <Button 
              onClick={onCancel} 
              variant="outline" 
              disabled={saving}
              className="shadow-sm transition-all duration-200"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}