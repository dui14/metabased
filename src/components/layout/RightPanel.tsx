'use client';

import { cn, formatDate } from '@/lib/utils';
import { Avatar } from '@/components/common';
import { Send, Search, MessageSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/providers';
import Link from 'next/link';

interface Conversation {
  id: string;
  other_user_id: string;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  unread_count: number;
  last_message_at: string | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

const RightPanel = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchConversations = async () => {
      try {
        const res = await fetch(`/api/conversations?user_id=${user.id}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch {
        // silent
      }
    };

    fetchConversations();
    const timer = setInterval(fetchConversations, 15000);
    return () => clearInterval(timer);
  }, [user?.id]);

  useEffect(() => {
    if (!selectedConvId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?conversation_id=${selectedConvId}&limit=30`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch {
        // silent
      }
    };

    fetchMessages();
    const timer = setInterval(fetchMessages, 5000);
    return () => clearInterval(timer);
  }, [selectedConvId]);

  const handleSend = async () => {
    if (!message.trim() || !selectedConvId || !user?.id || isSending) return;

    const conv = conversations.find((c) => c.id === selectedConvId);
    if (!conv) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConvId,
          sender_id: user.id,
          receiver_id: conv.other_user_id,
          content: message.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setMessage('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        // update unread badge
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, last_message_at: new Date().toISOString() } : c))
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConvs = conversations.filter((c) => {
    const name = (c.other_display_name || c.other_username || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const activeConv = conversations.find((c) => c.id === selectedConvId);

  return (
    <aside className="fixed right-0 top-0 h-screen w-[25%] border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-colors z-50 hidden lg:flex">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-dark dark:text-white">Messages</h2>
          <Link href="/messages" className="text-xs text-primary-500 hover:underline">
            View all
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className={cn('overflow-y-auto border-b border-gray-100 dark:border-gray-800', selectedConvId ? 'h-[40%]' : 'flex-1')}>
          {filteredConvs.length > 0 ? (
            filteredConvs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 transition-colors text-left',
                  selectedConvId === conv.id
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <Avatar
                  src={conv.other_avatar_url || undefined}
                  alt={conv.other_display_name || conv.other_username || 'User'}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-dark dark:text-white truncate">
                      {conv.other_display_name || conv.other_username || 'Unknown'}
                    </p>
                    {conv.last_message_at && (
                      <span className="text-xs text-gray-400 shrink-0 ml-1">
                        {formatDate(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">@{conv.other_username}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="min-w-5 h-5 px-1 bg-primary-400 text-white text-xs rounded-full flex items-center justify-center shrink-0">
                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageSquare size={32} className="text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">
                {user ? 'Chưa có cuộc trò chuyện' : 'Đăng nhập để xem tin nhắn'}
              </p>
            </div>
          )}
        </div>

        {/* Active Chat */}
        {selectedConvId && activeConv && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <Avatar
                src={activeConv.other_avatar_url || undefined}
                alt={activeConv.other_display_name || activeConv.other_username || 'User'}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark dark:text-white truncate">
                  {activeConv.other_display_name || activeConv.other_username}
                </p>
                <p className="text-xs text-gray-400 truncate">@{activeConv.other_username}</p>
              </div>
              <Link
                href="/messages"
                className="text-xs text-primary-500 hover:underline shrink-0"
              >
                Open
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[85%] px-3 py-2 rounded-2xl text-sm',
                          isMe
                            ? 'bg-primary-400 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-800 text-dark dark:text-white rounded-bl-md'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-xs">Chưa có tin nhắn</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhắn tin..."
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || isSending}
                  className="p-2 bg-primary-400 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default RightPanel;
