"use client"

import * as React from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NotificationToastProps {
  type: 'success' | 'error'
  message: string
  onClose: () => void
  autoClose?: boolean
  duration?: number
}

export function NotificationToast({ 
  type, 
  message, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}: NotificationToastProps) {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, onClose])

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-md",
      "animate-in slide-in-from-top-2 duration-300",
      type === 'success' 
        ? "bg-green-50 border-green-200 text-green-800" 
        : "bg-red-50 border-red-200 text-red-800"
    )}>
      {type === 'success' ? (
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
      )}
      
      <p className="text-sm font-medium flex-1">{message}</p>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className={cn(
          "h-6 w-6 flex-shrink-0",
          type === 'success' 
            ? "hover:bg-green-100 text-green-600" 
            : "hover:bg-red-100 text-red-600"
        )}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}