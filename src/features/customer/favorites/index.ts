// Export context and hooks
export { FavoritesProvider, useFavoritesContext } from './context';
export { useFavorites } from './hooks';

// Export components
export { CustomerFavorites } from './components';

// Export types
export type {
  UserFavorite,
  FavoriteService,
  FavoritesState,
  FavoriteOperation,
  FavoritesContextValue,
  AddFavoriteRequest,
  AddFavoriteResponse,
  RemoveFavoriteRequest,
  RemoveFavoriteResponse,
  GetFavoritesResponse,
  CheckFavoriteResponse,
  ApiErrorResponse,
} from './types';