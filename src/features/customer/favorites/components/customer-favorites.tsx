"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import { FavoriteButton } from "@/features/shared/favorite-button";
import { useFavoritesContext } from "../context/favorites-context";
import { toast } from "sonner";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1526758097130-bab247274f58?w=900&q=80";

interface ServiceSummary {
  favorite_id: string;
  favorited_at: string;
  id: string;
  name: string;
  slug: string;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
  duration_minutes: number;
  cover_image_url?: string;
  category?: string;
  description?: string | null;
}

interface CustomerFavoritesProps {
  initialFavorites?: ServiceSummary[];
  isAuthenticated?: boolean;
}

function formatPrice(min: number, max: number, currency: string) {
  const sym = currency === "USD" ? "$" : currency;
  const minStr = (min / 100).toFixed(0);
  const maxStr = (max / 100).toFixed(0);
  return min === max ? `${sym}${minStr}` : `${sym}${minStr} – ${sym}${maxStr}`;
}

export function CustomerFavorites({
  initialFavorites,
  isAuthenticated = true,
}: CustomerFavoritesProps) {
  const [favorites, setFavorites] = useState<ServiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { removeFavorite } = useFavoritesContext();

  const loadFavorites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/favorites", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.favorites)) {
        throw new Error("Invalid response format from server");
      }
      setFavorites(data.favorites);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load favorites");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (initialFavorites && initialFavorites.length > 0) {
      setFavorites(initialFavorites);
      setIsLoading(false);
    } else {
      loadFavorites();
    }
  }, [loadFavorites, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = async (serviceId: string, serviceName: string) => {
    try {
      await removeFavorite(serviceId);
      setFavorites((prev) => prev.filter((f) => f.id !== serviceId));
      toast.success(`Removed "${serviceName}" from favorites`);
    } catch {
      toast.error("Failed to remove from favorites");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">My Favorites</h1>
          <p className="text-muted-foreground">Your saved services for easy booking</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">My Favorites</h1>
          <p className="text-muted-foreground">Your saved services for easy booking</p>
        </div>
        <Empty className="border-destructive/20">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Heart className="text-destructive" /></EmptyMedia>
            <EmptyTitle>Failed to load favorites</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">My Favorites</h1>
          <p className="text-muted-foreground">Your saved services for easy booking</p>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Heart /></EmptyMedia>
            <EmptyTitle>No favorites yet</EmptyTitle>
            <EmptyDescription>
              Browse services and tap the heart icon to save them here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild><Link href="/services">Browse Services</Link></Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">My Favorites</h1>
        <p className="text-muted-foreground">
          {favorites.length} saved service{favorites.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {favorites.map((service) => (
          <div
            key={service.id}
            className="group bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
          >
            {/* Image */}
            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
              <Image
                src={service.cover_image_url || FALLBACK_IMAGE}
                alt={service.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Category pill */}
              {service.category && (
                <span className="absolute top-3 left-3 px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-800 shadow-sm">
                  {service.category}
                </span>
              )}
              {/* Favorite button — always visible (filled), click removes */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <FavoriteButton
                  serviceId={service.id}
                  variant="compact"
                  className="h-8 w-8 rounded-full bg-white/90 shadow-md hover:bg-white"
                  onToggle={(id, isFav) => {
                    if (!isFav) handleRemove(id, service.name);
                  }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                  {service.name}
                </h3>
                <span className="text-base font-bold text-gray-900 whitespace-nowrap shrink-0">
                  {formatPrice(service.min_price_cents, service.max_price_cents, service.currency)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                {service.duration_minutes} min
              </div>

              {service.description && (
                <p className="text-sm text-gray-500 line-clamp-2 flex-1 mb-5">
                  {service.description}
                </p>
              )}

              <div className="flex gap-3 mt-auto">
                <Link
                  href={`/services/${service.slug}`}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-semibold text-center transition-colors"
                >
                  Details
                </Link>
                <Link
                  href={`/book?service=${service.id}`}
                  className="flex-1 py-2.5 rounded-xl bg-[#6B4423] hover:bg-[#4A2C1A] text-white text-sm font-semibold text-center transition-colors"
                >
                  Book
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
