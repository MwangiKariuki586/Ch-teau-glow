// Favorite button component props
export interface FavoriteButtonProps {
  serviceId: string
  variant?: 'default' | 'compact'
  className?: string
  disabled?: boolean
  showLabel?: boolean
  onToggle?: (serviceId: string, isFavorite: boolean) => void
}

// Favorite button state
export interface FavoriteButtonState {
  isFavorite: boolean
  isLoading: boolean
  error: string | null
}