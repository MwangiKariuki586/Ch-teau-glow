// Core favorites types
export interface UserFavorite {
  id: string;
  user_id: string;
  service_id: string;
  created_at: string;
}

export interface FavoriteService {
  id: string;
  name: string;
  slug: string;
  price_range: string;
  duration: number;
  image_url?: string;
  favorited_at: string;
}

export interface FavoritesState {
  favorites: Set<string>;
  isLoading: boolean;
  error: string | null;
}

export interface FavoriteOperation {
  type: 'add' | 'remove';
  serviceId: string;
  optimistic: boolean;
}

// Context interface
export interface FavoritesContextValue {
  favorites: Set<string>;
  isLoading: boolean;
  error: string | null;
  addFavorite: (serviceId: string) => Promise<void>;
  removeFavorite: (serviceId: string) => Promise<void>;
  isFavorite: (serviceId: string) => boolean;
  refreshFavorites: () => Promise<void>;
  clearError: () => void;
}

// Re-export API types
export * from './api';