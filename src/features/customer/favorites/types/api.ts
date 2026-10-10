import { UserFavorite, FavoriteService } from './index';

// API Request types
export interface AddFavoriteRequest {
  service_id: string;
}

export interface RemoveFavoriteRequest {
  service_id: string;
}

// API Response types
export interface AddFavoriteResponse {
  success: boolean;
  favorite: UserFavorite;
}

export interface RemoveFavoriteResponse {
  success: boolean;
}

export interface GetFavoritesResponse {
  favorites: FavoriteService[];
  total: number;
}

export interface CheckFavoriteResponse {
  is_favorite: boolean;
}

// Error response type
export interface ApiErrorResponse {
  error: string;
  message?: string;
}