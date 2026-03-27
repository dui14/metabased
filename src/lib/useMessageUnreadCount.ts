'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/providers';

export const MESSAGES_UPDATED_EVENT = 'metabased:messages-updated';

export function emitMessagesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MESSAGES_UPDATED_EVENT));
  }
}

/**
 * Hook polling unread message count cho sidebar badge
 * Pattern tương tự useNotificationUnreadCount
 */
export function useMessageUnreadCount(options?: { pollingMs?: number; enabled?: boolean }) {
  const pollingMs = options?.pollingMs ?? 30000; // 30s default
  const enabled = options?.enabled ?? true;
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled || !user?.id) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/messages/unread-count?user_id=${user.id}`, {
        method: 'GET',
        cache: 'no-store',
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
  }, [enabled, user?.id]);

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

    const handleUpdate = () => {
      void refreshUnreadCount();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    }, pollingMs);

    window.addEventListener('focus', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(MESSAGES_UPDATED_EVENT, handleUpdate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(MESSAGES_UPDATED_EVENT, handleUpdate);
    };
  }, [enabled, pollingMs, refreshUnreadCount]);

  return useMemo(
    () => ({ unreadCount, isLoading, refreshUnreadCount, setUnreadCount }),
    [isLoading, refreshUnreadCount, unreadCount]
  );
}
