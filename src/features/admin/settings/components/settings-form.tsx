"use client"

import { ReactNode } from "react"
import { Save, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

interface SettingsFormProps {
  children: ReactNode
  hasChanges?: boolean
  isSaving?: boolean
  onSave?: () => void
  onReset?: () => void
  showAlert?: boolean
  alertMessage?: string
}

export function SettingsForm({ 
  children, 
  hasChanges = false,
  isSaving = false,
  onSave,
  onReset,
  showAlert = false,
  alertMessage = "You have unsaved changes. Don't forget to save your settings."
}: SettingsFormProps) {
  return (
    <div className="space-y-6">
      {showAlert && hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {alertMessage}
          </AlertDescription>
        </Alert>
      )}
      
      {children}
      
      {hasChanges && (onSave || onReset) && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          {onReset && (
            <Button variant="outline" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Changes
            </Button>
          )}
          {onSave && (
            <Button 
              onClick={onSave}
              disabled={isSaving}
              className="bg-[#6B4423] hover:bg-[#5A3A1D]"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}