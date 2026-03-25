'use client';

import { MainLayout } from '@/components/layout';
import { Avatar } from '@/components/common';
import { Search, Send, MessageSquare, Loader2, ArrowLeft, Settings } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth, useChat } from '@/providers';
import { useRouter, useSearchParams } from 'next/navigation';
import { emitMessagesUpdated } from '@/lib/useMessageUnreadCount';
import type { ConversationMessage as Message, ConversationSummary as Conversation } from '@/lib/messaging-types';
import { useMessagingCenter } from '@/lib/useMessagingCenter';

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUsername = searchParams.get('to');
  const { messages: realtimeMessages, sendMessage, subscribeToConversation, unsubscribeFromConversation, markAsRead } = useChat();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [messageSettings, setMessageSettings] = useState<'everyone' | 'following'>('everyone');
  const selectedConversationId = selectedConversation?.id ?? null;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    conversations,
    presenceByUserId,
    isLoading,
    fetchConversations,
    fetchMessages,
    setConversations,
    markConversationReadLocally,
  } = useMessagingCenter({
    userId: user?.id,
    enabled: Boolean(user),
    selectedConversationId: selectedConversation?.id || null,
  });

  const loadConversationMessages = useCallback(async (
    conversationId: string,
    options?: { showLoading?: boolean }
  ) => {
    if (options?.showLoading !== false) {
      setIsMessagesLoading(true);
    }

    try {
      const nextMessages = await fetchMessages(conversationId);
      setMessages(nextMessages);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [fetchMessages]);

  useEffect(() => {
    if (user) {
      fetchMessageSettings();
    }
  }, [user]);

  const fetchMessageSettings = async () => {
    try {
      const token = localStorage.getItem('dynamic_authentication_token');
      const response = await fetch('/api/users/message-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMessageSettings(data.message_permission || 'everyone');
      }
    } catch (error) {
      console.error('Error fetching message settings:', error);
    }
  };

  const updateMessageSettings = async (newSetting: 'everyone' | 'following') => {
    try {
      const token = localStorage.getItem('dynamic_authentication_token');
      const response = await fetch('/api/users/message-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message_permission: newSetting }),
      });
      
      if (response.ok) {
        setMessageSettings(newSetting);
      }
    } catch (error) {
      console.error('Error updating message settings:', error);
    }
  };

  useEffect(() => {
    if (selectedConversationId) {
      void loadConversationMessages(selectedConversationId);
      subscribeToConversation(selectedConversationId);
      void markAsRead(selectedConversationId);
      markConversationReadLocally(selectedConversationId);
    } else {
      setMessages([]);
      setIsMessagesLoading(false);
    }
    
    return () => {
      unsubscribeFromConversation();
    };
  }, [loadConversationMessages, markAsRead, markConversationReadLocally, selectedConversationId, subscribeToConversation, unsubscribeFromConversation]);

  useEffect(() => {
    if (!selectedConversationId || realtimeMessages.length === 0) {
      return;
    }

    setMessages((prev) => {
      const existingIds = new Set(prev.map((message) => message.id));
      const newMessages = realtimeMessages.filter((message) => (
        message.conversation_id === selectedConversationId && !existingIds.has(message.id)
      ));

      return newMessages.length > 0 ? [...prev, ...newMessages] : prev;
    });

    void fetchConversations();
  }, [fetchConversations, realtimeMessages, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadConversationMessages(selectedConversationId, {
          showLoading: false,
        });
      }
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadConversationMessages, selectedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initConversationWithUser = async () => {
      if (!targetUsername || !user) return;

      try {
        const convs = await fetchConversations();
        
        const existingConv = convs.find(
          (conv: Conversation) => conv.other_username.toLowerCase() === targetUsername.toLowerCase()
        );

        if (existingConv) {
          setSelectedConversation(existingConv);
        } else {
          const token = localStorage.getItem('dynamic_authentication_token');
          const response = await fetch(`/api/users/profile?username=${targetUsername}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              const createResponse = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  user_id: user.id,
                  other_user_id: data.user.id,
                }),
              });

              if (createResponse.ok) {
                const { conversation } = await createResponse.json();
                const newConv: Conversation = {
                  id: conversation.id,
                  other_user_id: data.user.id,
                  other_username: data.user.username || '',
                  other_display_name: data.user.display_name || data.user.username || '',
                  other_avatar_url: data.user.avatar_url || '',
                  last_message_at: conversation.created_at || new Date().toISOString(),
                  unread_count: 0,
                };
                
                setConversations((prev) => [newConv, ...prev]);
                setSelectedConversation(newConv);
              }
            }
          }
        }
        
        router.replace('/messages', { scroll: false });
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };

    if (targetUsername && user) {
      initConversationWithUser();
    }
  }, [fetchConversations, router, targetUsername, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: {
        username: user.username || '',
        display_name: user.display_name || '',
      },
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      await sendMessage(selectedConversation.id, selectedConversation.other_user_id, content);
      await fetchConversations();
      emitMessagesUpdated();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.other_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout showRightPanel={false}>
      <div className="h-[calc(100vh-80px)] flex">
        <div className="w-80 border-r border-gray-100 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-dark">Messages</h2>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings size={20} className="text-gray-600" />
              </button>
            </div>
            
            {showSettings && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-dark mb-2">Ai có thể gửi tin nhắn cho bạn?</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="messageSettings"
                      value="everyone"
                      checked={messageSettings === 'everyone'}
                      onChange={(e) => updateMessageSettings(e.target.value as 'everyone')}
                      className="w-4 h-4 text-primary-500"
                    />
                    <span className="text-sm text-gray-700">Tất cả mọi người</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="messageSettings"
                      value="following"
                      checked={messageSettings === 'following'}
                      onChange={(e) => updateMessageSettings(e.target.value as 'following')}
                      className="w-4 h-4 text-primary-500"
                    />
                    <span className="text-sm text-gray-700">Chỉ người mình follow</span>
                  </label>
                </div>
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 transition-colors text-left',
                    selectedConversation?.id === conv.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                  )}
                >
                  <Avatar src={conv.other_avatar_url} alt={conv.other_display_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark truncate">{conv.other_display_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      @{conv.other_username}
                      <span className={cn('ml-2 inline-flex items-center gap-1', presenceByUserId[conv.other_user_id]?.is_online ? 'text-green-600' : 'text-gray-400')}>
                        <span className={cn('inline-block h-2 w-2 rounded-full', presenceByUserId[conv.other_user_id]?.is_online ? 'bg-green-500' : 'bg-gray-300')} />
                        {presenceByUserId[conv.other_user_id]?.is_online ? 'Online' : 'Offline'}
                      </span>
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 bg-primary-400 text-white text-xs rounded-full flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Chưa có cuộc trò chuyện</p>
                <p className="text-gray-400 text-sm mt-1">Bắt đầu trò chuyện với người dùng khác</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedConversation ? (
            <>
              <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Avatar src={selectedConversation.other_avatar_url} alt={selectedConversation.other_display_name} size="md" />
                  <div>
                    <p className="font-semibold text-dark">{selectedConversation.other_display_name}</p>
                    <p className="text-sm text-gray-400">
                      @{selectedConversation.other_username}
                      <span className={cn('ml-2 inline-flex items-center gap-1', presenceByUserId[selectedConversation.other_user_id]?.is_online ? 'text-green-600' : 'text-gray-400')}>
                        <span className={cn('inline-block h-2 w-2 rounded-full', presenceByUserId[selectedConversation.other_user_id]?.is_online ? 'bg-green-500' : 'bg-gray-300')} />
                        {presenceByUserId[selectedConversation.other_user_id]?.is_online ? 'Online' : 'Offline'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isMessagesLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                  </div>
                ) : messages.length > 0 ? messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[70%]', isMe ? 'items-end' : 'items-start')}>
                        <div
                          className={cn(
                            'px-4 py-2.5 rounded-2xl',
                            isMe
                              ? 'bg-primary-500 text-white rounded-br-md'
                              : 'bg-white text-dark rounded-bl-md shadow-sm'
                          )}
                        >
                          <p className="text-sm break-words">{msg.content}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                    <MessageSquare size={48} className="mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">Chua co tin nhan nao</p>
                    <p className="mt-1 text-xs">Hay gui tin nhan dau tien trong cuoc tro chuyen nay.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-end gap-3">
                  <div className="flex-1 flex items-end gap-2 p-3 bg-gray-50 rounded-2xl">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 bg-transparent text-dark placeholder-gray-400 resize-none focus:outline-none text-sm max-h-32"
                      rows={1}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={64} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Chọn một cuộc trò chuyện</p>
                <p className="text-gray-400 text-sm mt-1">để bắt đầu nhắn tin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
