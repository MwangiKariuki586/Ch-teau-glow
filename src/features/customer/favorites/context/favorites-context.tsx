"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { subscribeToTable, unsubscribe } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  FavoritesContextValue,
  FavoritesState,
  FavoriteOperation,
} from "../types";

// Context creation
const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

// Action types for reducer
type FavoritesAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_FAVORITES"; payload: Set<string> }
  | { type: "ADD_FAVORITE_OPTIMISTIC"; payload: string }
  | { type: "REMOVE_FAVORITE_OPTIMISTIC"; payload: string }
  | { type: "REVERT_OPTIMISTIC"; payload: Set<string> }
  | { type: "SYNC_FROM_STORAGE"; payload: Set<string> }
  | { type: "CLEAR_ERROR" };

// Storage keys for cross-tab synchronization
const FAVORITES_STORAGE_KEY = "favorites_sync";
const FAVORITES_TIMESTAMP_KEY = "favorites_timestamp";

// Initial state
const initialState: FavoritesState = {
  favorites: new Set<string>(),
  isLoading: false,
  error: null,
};

// Reducer function
function favoritesReducer(
  state: FavoritesState,
  action: FavoritesAction,
): FavoritesState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "SET_FAVORITES":
      return {
        ...state,
        favorites: action.payload,
        isLoading: false,
        error: null,
      };

    case "ADD_FAVORITE_OPTIMISTIC": {
      const newFavorites = new Set(state.favorites);
      newFavorites.add(action.payload);
      return { ...state, favorites: newFavorites };
    }

    case "REMOVE_FAVORITE_OPTIMISTIC": {
      const newFavorites = new Set(state.favorites);
      newFavorites.delete(action.payload);
      return { ...state, favorites: newFavorites };
    }

    case "REVERT_OPTIMISTIC":
      return { ...state, favorites: action.payload };

    case "SYNC_FROM_STORAGE":
      return { ...state, favorites: action.payload };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}

// Provider props
interface FavoritesProviderProps {
  children: React.ReactNode;
  initialFavorites?: string[];
  userId?: string;
}

// Provider component
export function FavoritesProvider({
  children,
  initialFavorites = [],
  userId,
}: FavoritesProviderProps) {
  const [state, dispatch] = useReducer(favoritesReducer, {
    ...initialState,
    favorites: new Set(initialFavorites),
  });

  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingOperationsRef = useRef<Map<string, "add" | "remove">>(new Map());
  const lastSyncTimestampRef = useRef<number>(Date.now());
  // Use a ref to always have access to the latest favorites for revert logic
  const favoritesRef = useRef<Set<string>>(state.favorites);
  favoritesRef.current = state.favorites;

  // Sync favorites to localStorage for cross-tab communication
  const syncToStorage = useCallback((favorites: Set<string>) => {
    if (typeof window !== "undefined") {
      const timestamp = Date.now();
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(Array.from(favorites)),
      );
      localStorage.setItem(FAVORITES_TIMESTAMP_KEY, timestamp.toString());
      lastSyncTimestampRef.current = timestamp;
    }
  }, []);

  // Load favorites from localStorage
  const loadFromStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        const timestamp = localStorage.getItem(FAVORITES_TIMESTAMP_KEY);

        if (stored && timestamp) {
          const storedTimestamp = parseInt(timestamp, 10);
          // Only sync if the stored data is newer than our last sync
          if (storedTimestamp > lastSyncTimestampRef.current) {
            const favorites = JSON.parse(stored);
            dispatch({
              type: "SYNC_FROM_STORAGE",
              payload: new Set(favorites),
            });
            lastSyncTimestampRef.current = storedTimestamp;
          }
        }
      } catch (error) {
        console.warn("Failed to load favorites from storage:", error);
      }
    }
  }, []);

  // Load favorites from API
  const loadFavorites = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await fetch("/api/favorites", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load favorites");
      }

      const data = await response.json();
      // The API returns formatted favorites where each item's `id` is the service id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const favoriteIds = data.favorites?.map((fav: any) => fav.id) || [];

      dispatch({ type: "SET_FAVORITES", payload: new Set(favoriteIds) });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to load favorites",
      });
    }
  }, []);

  // Listen for storage changes (cross-tab synchronization)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FAVORITES_STORAGE_KEY && e.newValue) {
        try {
          const timestamp = localStorage.getItem(FAVORITES_TIMESTAMP_KEY);
          if (timestamp) {
            const storedTimestamp = parseInt(timestamp, 10);
            if (storedTimestamp > lastSyncTimestampRef.current) {
              const favorites = JSON.parse(e.newValue);
              dispatch({
                type: "SYNC_FROM_STORAGE",
                payload: new Set(favorites),
              });
              lastSyncTimestampRef.current = storedTimestamp;
            }
          }
        } catch (error) {
          console.warn("Failed to sync favorites from storage:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Set up real-time subscription for database changes
  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToTable(
      "user_favorites",
      (payload) => {
        // Only process changes for the current user
        const affectedUserId = payload.new?.user_id || payload.old?.user_id;
        if (affectedUserId !== userId) return;

        const serviceId = payload.new?.service_id || payload.old?.service_id;
        if (!serviceId) return;

        // Skip if this change was initiated by this client (check pending operations)
        if (pendingOperationsRef.current.has(serviceId)) {
          pendingOperationsRef.current.delete(serviceId);
          return;
        }

        // Apply the change from real-time subscription
        if (payload.eventType === "INSERT") {
          dispatch({ type: "ADD_FAVORITE_OPTIMISTIC", payload: serviceId });
        } else if (payload.eventType === "DELETE") {
          dispatch({ type: "REMOVE_FAVORITE_OPTIMISTIC", payload: serviceId });
        }
      },
      `user_id=eq.${userId}`,
    );

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        unsubscribe(realtimeChannelRef.current);
      }
    };
  }, [userId]);

  // Sync favorites to storage whenever they change
  useEffect(() => {
    syncToStorage(state.favorites);
  }, [state.favorites, syncToStorage]);

  // Periodic cache cleanup
  useEffect(() => {
    const cleanup = () => {
      if (typeof window !== "undefined") {
        // Import cache dynamically to avoid SSR issues
        import("../utils/cache").then(({ favoritesCache }) => {
          favoritesCache.cleanup();
        });
      }
    };

    // Clean up cache every 5 minutes
    const interval = setInterval(cleanup, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Load initial favorites on mount (loadFavorites is now declared above)
  useEffect(() => {
    if (initialFavorites.length === 0) {
      // Try loading from storage first for faster initial load
      loadFromStorage();
      // Then load from server for accuracy
      loadFavorites();
    }
    // Only run on mount — initialFavorites is from props and loadFromStorage/loadFavorites are stable callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add favorite with optimistic update
  const addFavorite = useCallback(async (serviceId: string) => {
    // Skip if already favorited
    if (favoritesRef.current.has(serviceId)) {
      return;
    }

    // Snapshot current state for revert
    const previousFavorites = new Set(favoritesRef.current);

    // Optimistic update
    dispatch({ type: "ADD_FAVORITE_OPTIMISTIC", payload: serviceId });

    // Mark as pending operation for real-time sync filtering
    pendingOperationsRef.current.set(serviceId, "add");

    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ service_id: serviceId }),
      });

      if (!response.ok) {
        throw new Error("Failed to add favorite");
      }

      pendingOperationsRef.current.delete(serviceId);
      dispatch({ type: "CLEAR_ERROR" });
    } catch (error) {
      // Revert optimistic update using the snapshot
      pendingOperationsRef.current.delete(serviceId);
      dispatch({ type: "REVERT_OPTIMISTIC", payload: previousFavorites });
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to add favorite",
      });
      throw error;
    }
  }, []);

  // Remove favorite with optimistic update
  const removeFavorite = useCallback(async (serviceId: string) => {
    // Skip if not favorited
    if (!favoritesRef.current.has(serviceId)) {
      return;
    }

    // Snapshot current state for revert
    const previousFavorites = new Set(favoritesRef.current);

    // Optimistic update
    dispatch({ type: "REMOVE_FAVORITE_OPTIMISTIC", payload: serviceId });

    // Mark as pending operation for real-time sync filtering
    pendingOperationsRef.current.set(serviceId, "remove");

    try {
      const response = await fetch(`/api/favorites/${serviceId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to remove favorite");
      }

      pendingOperationsRef.current.delete(serviceId);
      dispatch({ type: "CLEAR_ERROR" });
    } catch (error) {
      // Revert optimistic update using the snapshot
      pendingOperationsRef.current.delete(serviceId);
      dispatch({ type: "REVERT_OPTIMISTIC", payload: previousFavorites });
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to remove favorite",
      });
      throw error;
    }
  }, []);

  // Check if service is favorited
  const isFavorite = useCallback(
    (serviceId: string): boolean => {
      return state.favorites.has(serviceId);
    },
    [state.favorites],
  );

  // Refresh favorites from server
  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue: FavoritesContextValue = useMemo(
    () => ({
      favorites: state.favorites,
      isLoading: state.isLoading,
      error: state.error,
      addFavorite,
      removeFavorite,
      isFavorite,
      refreshFavorites,
      clearError,
    }),
    [
      state.favorites,
      state.isLoading,
      state.error,
      addFavorite,
      removeFavorite,
      isFavorite,
      refreshFavorites,
      clearError,
    ],
  );

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}

// Hook to use favorites context
export function useFavoritesContext(): FavoritesContextValue {
  const context = useContext(FavoritesContext);

  if (context === undefined) {
    throw new Error(
      "useFavoritesContext must be used within a FavoritesProvider",
    );
  }

  return context;
}
