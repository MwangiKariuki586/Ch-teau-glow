import { useCallback } from 'react';
import { useFavoritesContext } from '../context/favorites-context';

/**
 * Hook for interacting with favorites functionality
 * Provides a clean interface for components to manage favorites
 */
export function useFavorites() {
  const context = useFavoritesContext();

  const toggleFavorite = useCallback(async (serviceId: string) => {
    if (context.isFavorite(serviceId)) {
      await context.removeFavorite(serviceId);
    } else {
      await context.addFavorite(serviceId);
    }
  }, [context]);

  return {
    favorites: context.favorites,
    isLoading: context.isLoading,
    error: context.error,
    addFavorite: context.addFavorite,
    removeFavorite: context.removeFavorite,
    toggleFavorite,
    isFavorite: context.isFavorite,
    refreshFavorites: context.refreshFavorites,
    clearError: context.clearError,
  };
}