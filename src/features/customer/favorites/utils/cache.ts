/**
 * Client-side cache for favorites data with TTL support
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class FavoritesCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if cache has valid entry
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      const isExpired = now - entry.timestamp > entry.ttl;
      if (isExpired) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton cache instance
export const favoritesCache = new FavoritesCache();

// Cache keys
export const CACHE_KEYS = {
  FAVORITES_LIST: (userId: string) => `favorites:list:${userId}`,
  FAVORITE_STATUS: (userId: string, serviceId: string) => `favorites:status:${userId}:${serviceId}`,
  FAVORITES_COUNT: (userId: string) => `favorites:count:${userId}`,
} as const;

// Cache TTL values
export const CACHE_TTL = {
  FAVORITES_LIST: 5 * 60 * 1000, // 5 minutes
  FAVORITE_STATUS: 10 * 60 * 1000, // 10 minutes
  FAVORITES_COUNT: 2 * 60 * 1000, // 2 minutes
} as const;