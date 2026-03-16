'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export const NOTIFICATIONS_UPDATED_EVENT = 'metabased:notifications-updated';

export function emitNotificationsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  }
}

export function useNotificationUnreadCount(options?: { pollingMs?: number; enabled?: boolean }) {
  const pollingMs = options?.pollingMs ?? 15000;
  const enabled = options?.enabled ?? true;
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/notifications/unread-count', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUnreadCount(0);
        }
        return;
      }

      const data = await response.json() as { unread_count?: number };
      setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0);
    } catch {
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refreshUnreadCount();

    if (!enabled) {
      return;
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    };

    const handleFocus = () => {
      void refreshUnreadCount();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    }, pollingMs);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleFocus);
    };
  }, [enabled, pollingMs, refreshUnreadCount]);

  return useMemo(
    () => ({ unreadCount, isLoading, refreshUnreadCount, setUnreadCount }),
    [isLoading, refreshUnreadCount, unreadCount]
  );
}