"use client"

import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"

interface SettingsSectionHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
}

export function SettingsSectionHeader({ 
  title, 
  description, 
  icon: Icon, 
  actions 
}: SettingsSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-[#6B4423]" />}
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}