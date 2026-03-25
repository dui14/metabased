'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { emitMessagesUpdated, MESSAGES_UPDATED_EVENT } from './useMessageUnreadCount';
import type {
  ConversationMessage,
  ConversationPresence,
  ConversationSummary,
} from './messaging-types';

interface UseMessagingCenterOptions {
  userId?: string | null;
  enabled?: boolean;
  selectedConversationId?: string | null;
  onConversationsUpdated?: (conversations: ConversationSummary[]) => void;
}

export function useMessagingCenter(options: UseMessagingCenterOptions) {
  const { userId, enabled = true, selectedConversationId, onConversationsUpdated } = options;
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, ConversationPresence>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchPresence = useCallback(async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));

    if (uniqueIds.length === 0) {
      setPresenceByUserId({});
      return;
    }

    try {
      const response = await fetch(`/api/presence?user_ids=${encodeURIComponent(uniqueIds.join(','))}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json() as {
        presence?: Record<string, ConversationPresence>;
      };

      setPresenceByUserId(data.presence || {});
    } catch (error) {
      console.error('Error fetching presence:', error);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!enabled || !userId) {
      setConversations([]);
      setIsLoading(false);
      return [] as ConversationSummary[];
    }

    try {
      const response = await fetch(`/api/conversations?user_id=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        return [] as ConversationSummary[];
      }

      const data = await response.json() as { conversations?: ConversationSummary[] };
      const nextConversations = data.conversations || [];
      setConversations(nextConversations);
      onConversationsUpdated?.(nextConversations);
      void fetchPresence(nextConversations.map((conversation) => conversation.other_user_id));
      return nextConversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [] as ConversationSummary[];
    } finally {
      setIsLoading(false);
    }
  }, [enabled, fetchPresence, onConversationsUpdated, userId]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages?conversation_id=${encodeURIComponent(conversationId)}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        return [] as ConversationMessage[];
      }

      const data = await response.json() as { messages?: ConversationMessage[] };
      return data.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [] as ConversationMessage[];
    }
  }, []);

  const markConversationReadLocally = useCallback((conversationId: string) => {
    setConversations((prev) => prev.map((conversation) => (
      conversation.id === conversationId
        ? { ...conversation, unread_count: 0 }
        : conversation
    )));
    emitMessagesUpdated();
  }, []);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    void fetchConversations();
  }, [enabled, fetchConversations, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchConversations();
      }
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, fetchConversations, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const handleMessagesUpdated = () => {
      void fetchConversations();
    };

    window.addEventListener(MESSAGES_UPDATED_EVENT, handleMessagesUpdated);

    return () => {
      window.removeEventListener(MESSAGES_UPDATED_EVENT, handleMessagesUpdated);
    };
  }, [enabled, fetchConversations, userId]);

  useEffect(() => {
    if (!enabled || !selectedConversationId) {
      return;
    }

    markConversationReadLocally(selectedConversationId);
  }, [enabled, markConversationReadLocally, selectedConversationId]);

  return useMemo(() => ({
    conversations,
    presenceByUserId,
    isLoading,
    fetchConversations,
    fetchMessages,
    setConversations,
    markConversationReadLocally,
  }), [
    conversations,
    fetchConversations,
    fetchMessages,
    isLoading,
    markConversationReadLocally,
    presenceByUserId,
  ]);
}
