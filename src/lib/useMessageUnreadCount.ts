'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export const MESSAGES_UPDATED_EVENT = 'metabased:messages-updated';

export function emitMessagesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MESSAGES_UPDATED_EVENT));
  }
}

export function useMessageUnreadCount(userId?: string | null, options?: { pollingMs?: number; enabled?: boolean }) {
  const pollingMs = options?.pollingMs ?? 3000;
  const enabled = (options?.enabled ?? true) && Boolean(userId);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled || !userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch(`/api/conversations?user_id=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json() as { conversations?: Array<{ unread_count?: number }> };
      const total = (data.conversations || []).reduce((sum, conversation) => sum + (conversation.unread_count || 0), 0);
      setUnreadCount(total);
    } catch {
      setUnreadCount(0);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void refreshUnreadCount();

    if (!enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    }, pollingMs);

    const handleRefresh = () => {
      void refreshUnreadCount();
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener(MESSAGES_UPDATED_EVENT, handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener(MESSAGES_UPDATED_EVENT, handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [enabled, pollingMs, refreshUnreadCount]);

  return useMemo(
    () => ({ unreadCount, refreshUnreadCount, setUnreadCount }),
    [refreshUnreadCount, unreadCount]
  );
}
