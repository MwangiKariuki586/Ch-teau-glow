import { 
  AddFavoriteRequest, 
  AddFavoriteResponse, 
  RemoveFavoriteResponse,
  GetFavoritesResponse,
  CheckFavoriteResponse,
  ApiErrorResponse 
} from '../types/api'
import { favoritesCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache'

export class FavoritesApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: ApiErrorResponse
  ) {
    super(message)
    this.name = 'FavoritesApiError'
  }
}

export interface GetFavoritesParams {
  page?: number
  limit?: number
  useCache?: boolean
}

// Request queue for batching operations
interface QueuedRequest {
  operation: 'add' | 'remove';
  serviceId: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class FavoritesApiClient {
  private requestQueue: QueuedRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // 100ms batch delay
  private readonly MAX_BATCH_SIZE = 10;

  /**
   * Add request to batch queue
   */
  private queueRequest(operation: 'add' | 'remove', serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ operation, serviceId, resolve, reject });

      // Process queue if it reaches max size
      if (this.requestQueue.length >= this.MAX_BATCH_SIZE) {
        this.processBatch();
      } else {
        // Set timeout to process batch
        if (this.batchTimeout) {
          clearTimeout(this.batchTimeout);
        }
        this.batchTimeout = setTimeout(() => this.processBatch(), this.BATCH_DELAY);
      }
    });
  }

  /**
   * Process batched requests
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = this.requestQueue.splice(0);
    if (batch.length === 0) return;

    // Group by operation type
    const addRequests = batch.filter(req => req.operation === 'add');
    const removeRequests = batch.filter(req => req.operation === 'remove');

    // Process add requests
    if (addRequests.length > 0) {
      try {
        await Promise.all(addRequests.map(req => this.performAddFavorite(req.serviceId)));
        addRequests.forEach(req => req.resolve({ success: true }));
      } catch (error) {
        addRequests.forEach(req => req.reject(error));
      }
    }

    // Process remove requests
    if (removeRequests.length > 0) {
      try {
        await Promise.all(removeRequests.map(req => this.performRemoveFavorite(req.serviceId)));
        removeRequests.forEach(req => req.resolve({ success: true }));
      } catch (error) {
        removeRequests.forEach(req => req.reject(error));
      }
    }
  }

  /**
   * Perform actual add favorite API call
   */
  private async performAddFavorite(serviceId: string): Promise<AddFavoriteResponse> {
    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ service_id: serviceId } satisfies AddFavoriteRequest),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new FavoritesApiError(
        data.error || 'Failed to add favorite',
        response.status,
        data
      )
    }

    return data
  }

  /**
   * Perform actual remove favorite API call
   */
  private async performRemoveFavorite(serviceId: string): Promise<RemoveFavoriteResponse> {
    const response = await fetch(`/api/favorites/${serviceId}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new FavoritesApiError(
        data.error || 'Failed to remove favorite',
        response.status,
        data
      )
    }

    return data
  }

  async addFavorite(serviceId: string): Promise<AddFavoriteResponse> {
    // Invalidate relevant cache entries
    const userId = this.getCurrentUserId();
    if (userId) {
      favoritesCache.delete(CACHE_KEYS.FAVORITES_LIST(userId));
      favoritesCache.delete(CACHE_KEYS.FAVORITE_STATUS(userId, serviceId));
      favoritesCache.delete(CACHE_KEYS.FAVORITES_COUNT(userId));
    }

    return this.queueRequest('add', serviceId);
  }

  async removeFavorite(serviceId: string): Promise<RemoveFavoriteResponse> {
    // Invalidate relevant cache entries
    const userId = this.getCurrentUserId();
    if (userId) {
      favoritesCache.delete(CACHE_KEYS.FAVORITES_LIST(userId));
      favoritesCache.delete(CACHE_KEYS.FAVORITE_STATUS(userId, serviceId));
      favoritesCache.delete(CACHE_KEYS.FAVORITES_COUNT(userId));
    }

    return this.queueRequest('remove', serviceId);
  }

  async getFavorites(params: GetFavoritesParams = {}): Promise<GetFavoritesResponse> {
    const { page = 1, limit = 10, useCache = true } = params;
    const userId = this.getCurrentUserId();

    // Check cache first if enabled
    if (useCache && userId) {
      const cacheKey = CACHE_KEYS.FAVORITES_LIST(userId);
      const cached = favoritesCache.get<GetFavoritesResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const searchParams = new URLSearchParams()
    
    if (page) {
      searchParams.set('page', page.toString())
    }
    if (limit) {
      searchParams.set('limit', limit.toString())
    }

    const url = `/api/favorites${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await fetch(url)

    const data = await response.json()

    if (!response.ok) {
      throw new FavoritesApiError(
        data.error || 'Failed to get favorites',
        response.status,
        data
      )
    }

    // Cache the result
    if (useCache && userId) {
      const cacheKey = CACHE_KEYS.FAVORITES_LIST(userId);
      favoritesCache.set(cacheKey, data, CACHE_TTL.FAVORITES_LIST);
    }

    return data
  }

  async checkFavorite(serviceId: string, useCache: boolean = true): Promise<CheckFavoriteResponse> {
    const userId = this.getCurrentUserId();

    // Check cache first if enabled
    if (useCache && userId) {
      const cacheKey = CACHE_KEYS.FAVORITE_STATUS(userId, serviceId);
      const cached = favoritesCache.get<CheckFavoriteResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await fetch(`/api/favorites/check/${serviceId}`)

    const data = await response.json()

    if (!response.ok) {
      throw new FavoritesApiError(
        data.error || 'Failed to check favorite status',
        response.status,
        data
      )
    }

    // Cache the result
    if (useCache && userId) {
      const cacheKey = CACHE_KEYS.FAVORITE_STATUS(userId, serviceId);
      favoritesCache.set(cacheKey, data, CACHE_TTL.FAVORITE_STATUS);
    }

    return data
  }

  /**
   * Get current user ID from context or auth
   * This is a placeholder - should be implemented based on your auth system
   */
  private getCurrentUserId(): string | null {
    // This would typically come from your auth context
    // For now, return null as we don't have access to the auth context here
    return null;
  }

  /**
   * Prefetch favorites for better performance
   */
  async prefetchFavorites(userId: string): Promise<void> {
    try {
      await this.getFavorites({ useCache: true });
    } catch (error) {
      // Silently fail prefetch to avoid disrupting user experience
      console.warn('Failed to prefetch favorites:', error);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    favoritesCache.clear();
  }
}

export const favoritesApi = new FavoritesApiClient();