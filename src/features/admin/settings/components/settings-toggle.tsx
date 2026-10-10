"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

interface SettingsToggleProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  showSeparator?: boolean
}

export function SettingsToggle({ 
  id, 
  label, 
  description, 
  checked, 
  onCheckedChange,
  showSeparator = false
}: SettingsToggleProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor={id} className="text-base">{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
      {showSeparator && <Separator />}
    </>
  )
}