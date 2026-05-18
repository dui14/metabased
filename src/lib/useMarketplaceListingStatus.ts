'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface MarketplaceListingStatus {
  id: string;
  quantity: number;
  remainingQuantity: number;
  isActive: boolean;
  isSoldOut: boolean;
  isCancelled: boolean;
  isExpired: boolean;
  status: 'active' | 'sold_out' | 'cancelled' | 'expired' | 'unknown';
  expiresAt: number;
}

interface UseMarketplaceListingStatusOptions {
  enabled?: boolean;
  pollingMs?: number;
}

export function useMarketplaceListingStatus(
  listingId?: string | null,
  options?: UseMarketplaceListingStatusOptions
) {
  const enabled = options?.enabled ?? true;
  const pollingMs = options?.pollingMs ?? 5000;
  const [listing, setListing] = useState<MarketplaceListingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !listingId) {
      setListing(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/marketplace/listings/${listingId}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 404) {
          setListing((prev) =>
            prev
              ? {
                  ...prev,
                  remainingQuantity: 0,
                  isActive: false,
                  isSoldOut: true,
                  isCancelled: false,
                  isExpired: false,
                  status: 'unknown',
                }
              : null
          );
        }
        return;
      }

      const data = await response.json();
      const next = data.listing;
      if (!next) return;

      const nextStatus = typeof next.status === 'string' ? next.status : 'unknown';
      setListing({
        id: String(next.id),
        quantity: typeof next.quantity === 'number' ? next.quantity : 0,
        remainingQuantity: typeof next.remaining_quantity === 'number' ? next.remaining_quantity : 0,
        isActive: !!next.is_active,
        isSoldOut: !!next.is_sold_out,
        isCancelled: !!next.is_cancelled,
        isExpired: !!next.is_expired,
        status: nextStatus,
        expiresAt: typeof next.expires_at === 'number' ? next.expires_at : 0,
      });
    } catch {
      // Ignore transient polling errors.
    } finally {
      setIsLoading(false);
    }
  }, [enabled, listingId]);

  useEffect(() => {
    if (!enabled || !listingId) {
      setListing(null);
      return;
    }

    void refresh();

    const shouldPoll = (listing?.isActive ?? true) && enabled && Boolean(listingId);

    if (!shouldPoll) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, pollingMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, listingId, pollingMs, refresh, listing?.isActive]);

  return useMemo(
    () => ({ listing, isLoading, refresh }),
    [listing, isLoading, refresh]
  );
}
