"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/context"
import type { FavoriteButtonProps } from "../types"

export function FavoriteButton({
  serviceId,
  variant = "default",
  className,
  disabled = false,
  showLabel = false,
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const supabase = createClient()

  // Check initial favorite status
  useEffect(() => {
    async function checkFavoriteStatus() {
      if (!isAuthenticated || authLoading) {
        setIsInitialLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/favorites/check/${serviceId}`)
        
        if (response.ok) {
          const data = await response.json()
          setIsFavorite(data.is_favorite)
        } else if (response.status === 401) {
          // Handle authentication error silently
          setIsFavorite(false)
        }
      } catch (error) {
        console.error("Failed to check favorite status:", error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    checkFavoriteStatus()
  }, [serviceId, isAuthenticated, authLoading])

  const handleToggle = async () => {
    if (isLoading || disabled) return

    if (!isAuthenticated) {
      toast.error("Please sign in to save favorites")
      return
    }

    try {
      setIsLoading(true)
      
      // Optimistic update
      const previousState = isFavorite
      setIsFavorite(!isFavorite)

      let response: Response
      
      if (isFavorite) {
        // Remove from favorites
        response = await fetch(`/api/favorites/${serviceId}`, {
          method: "DELETE",
        })
      } else {
        // Add to favorites
        response = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ service_id: serviceId }),
        })
      }

      if (!response.ok) {
        // Revert optimistic update on error
        setIsFavorite(previousState)
        
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 401) {
          toast.error("Please sign in to save favorites")
        } else {
          toast.error(errorData.error || "Failed to update favorites")
        }
        return
      }

      // Success feedback
      if (!isFavorite) {
        toast.success("Added to favorites")
      } else {
        toast.success("Removed from favorites")
      }

      // Call onToggle callback if provided
      onToggle?.(serviceId, !previousState)
      
    } catch (error) {
      // Revert optimistic update on error
      setIsFavorite(!isFavorite)
      console.error("Favorite toggle error:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render for unauthenticated users or during loading
  if (authLoading || isInitialLoading) {
    return null
  }

  // Don't render for unauthenticated users
  if (!isAuthenticated) {
    return null
  }

  const buttonSize = variant === "compact" ? "icon-sm" : showLabel ? "default" : "icon"
  const heartSize = variant === "compact" ? "h-4 w-4" : "h-5 w-5"

  return (
    <Button
      size={buttonSize}
      variant="ghost"
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={cn(
        "transition-all duration-200 hover:scale-105",
        isFavorite 
          ? "text-[#6B4423] hover:text-[#5A3A1D]" 
          : "text-muted-foreground hover:text-[#6B4423]",
        isLoading && "opacity-50",
        className
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart 
        className={cn(
          heartSize,
          "transition-all duration-200",
          isFavorite && "fill-current",
          isLoading && "animate-pulse"
        )} 
      />
      {showLabel && (
        <span className="ml-1.5 text-sm font-medium">
          {isFavorite ? "Saved" : "Add to Favourites"}
        </span>
      )}
    </Button>
  )
}