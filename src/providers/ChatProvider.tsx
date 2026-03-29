'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { createClient } from '@supabase/supabase-js';

const useLocalDb = process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = !useLocalDb ? createClient(supabaseUrl, supabaseAnonKey) : null;

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string | null; // nullable cho group messages
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
  sendMessage: (conversationId: string, receiverId: string | null, content: string) => Promise<void>;
  subscribeToConversation: (conversationId: string) => void;
  unsubscribeFromConversation: () => void;
  markAsRead: (conversationId: string) => Promise<void>;
  // Online presence
  onlineUsers: Set<string>;
  isUserOnline: (userId: string) => boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const supabaseChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Kiểm tra user online
  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Cập nhật online status qua API
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!user?.id) return;
    try {
      await fetch('/api/users/online-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, is_online: isOnline }),
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }, [user?.id]);

  const sendMessage = async (conversationId: string, receiverId: string | null, content: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: user.id,
          receiver_id: receiverId, // null cho group
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
  };

  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        user_id: user.id,
      }),
    });
  };

  const subscribeToConversation = (conversationId: string) => {
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
  };

  const unsubscribeFromConversation = () => {
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
  };

  // Setup WebSocket (local) hoặc Supabase Presence
  useEffect(() => {
    if (!user) return;

    if (useLocalDb) {
      // === WebSocket mode ===
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

          switch (data.type) {
            case 'message':
              if (data.message && data.message.sender_id !== user.id) {
                setMessages((prev) => [...prev, data.message]);
              }
              break;
            // Online status broadcasts từ server
            case 'user:online':
              if (data.user_id) {
                setOnlineUsers((prev) => new Set(prev).add(data.user_id));
              }
              break;
            case 'user:offline':
              if (data.user_id) {
                setOnlineUsers((prev) => {
                  const next = new Set(prev);
                  next.delete(data.user_id);
                  return next;
                });
              }
              break;
            case 'presence:sync':
              // Server gửi danh sách online users khi auth
              if (Array.isArray(data.online_users)) {
                setOnlineUsers(new Set(data.online_users));
              }
              break;
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

      // Heartbeat mỗi 30s để server biết user vẫn online
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, 30000);

      return () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        ws.close();
      };
    } else if (supabase) {
      // === Supabase Presence mode ===
      updateOnlineStatus(true);

      const presenceChannel = supabase
        .channel('online-presence')
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const online = new Set<string>();
          // presenceState trả về { key: [{ user_id: ... }] }
          Object.values(state).forEach((presences: any[]) => {
            presences.forEach((p: any) => {
              if (p.user_id) online.add(p.user_id);
            });
          });
          setOnlineUsers(online);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: user.id });
          }
        });

      presenceChannelRef.current = presenceChannel;

      // Cleanup on tab close/navigate
      const handleBeforeUnload = () => {
        updateOnlineStatus(false);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        updateOnlineStatus(false);
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current);
        }
        if (supabaseChannelRef.current) {
          supabase.removeChannel(supabaseChannelRef.current);
        }
      };
    }
  }, [user]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        subscribeToConversation,
        unsubscribeFromConversation,
        markAsRead,
        onlineUsers,
        isUserOnline,
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
