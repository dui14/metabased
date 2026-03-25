'use client';

import { createContext, useCallback, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { createClient } from '@supabase/supabase-js';
import { emitMessagesUpdated } from '@/lib/useMessageUnreadCount';

const useLocalDb = process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = !useLocalDb ? createClient(supabaseUrl, supabaseAnonKey) : null;

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'nft_share';
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (conversationId: string, receiverId: string, content: string) => Promise<void>;
  subscribeToConversation: (conversationId: string) => void;
  unsubscribeFromConversation: () => void;
  markAsRead: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const supabaseChannelRef = useRef<any>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  const sendMessage = useCallback(async (conversationId: string, receiverId: string, content: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          message_type: 'text',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send message:', errorData);
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      console.log('Message sent successfully:', data.message);
      emitMessagesUpdated();
      
      if (useLocalDb && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message',
          conversation_id: conversationId,
          message: data.message,
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [user]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        console.error('Failed to mark messages as read:', response.status);
        return;
      }

      emitMessagesUpdated();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user]);

  const subscribeToConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    setMessages([]);

    if (useLocalDb) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join',
          conversation_id: conversationId,
          user_id: user?.id,
        }));
      }
    } else if (supabase) {
      if (supabaseChannelRef.current) {
        supabase.removeChannel(supabaseChannelRef.current);
      }

      const channel = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMessage = payload.new as Message;
            if (newMessage.sender_id !== user?.id) {
              setMessages((prev) => [...prev, newMessage]);
            }
          }
        )
        .subscribe();

      supabaseChannelRef.current = channel;
    }
  }, [user?.id]);

  const unsubscribeFromConversation = useCallback(() => {
    if (useLocalDb && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave',
        conversation_id: currentConversationId,
      }));
    } else if (supabaseChannelRef.current) {
      supabase?.removeChannel(supabaseChannelRef.current);
      supabaseChannelRef.current = null;
    }
    
    setCurrentConversationId(null);
  }, [currentConversationId]);

  useEffect(() => {
    if (!user) return;

    if (useLocalDb) {
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({
          type: 'auth',
          user_id: user.id,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message' && data.message) {
            const isIncoming = data.message.sender_id !== user.id;
            const isCurrentConversation = currentConversationIdRef.current === data.message.conversation_id;
            const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';

            if (!isIncoming) {
              return;
            }

            if (isCurrentConversation) {
              setMessages((prev) => {
                const alreadyExists = prev.some((message) => message.id === data.message.id);
                return alreadyExists ? prev : [...prev, data.message];
              });

              if (isVisible) {
                void markAsRead(data.message.conversation_id);
                return;
              }
            }

            emitMessagesUpdated();
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      wsRef.current = ws;

      return () => {
        ws.close();
      };
    }

    return () => {
      if (supabaseChannelRef.current) {
        supabase?.removeChannel(supabaseChannelRef.current);
      }
    };
  }, [markAsRead, user]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        subscribeToConversation,
        unsubscribeFromConversation,
        markAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
