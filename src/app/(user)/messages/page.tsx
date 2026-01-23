'use client';

import { MainLayout } from '@/components/layout';
import { Avatar, Card } from '@/components/common';
import { Search, Send, Phone, Video, MoreHorizontal, Image as ImageIcon, Smile, Paperclip, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface Chat {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
    online: boolean;
  };
  lastMessage: string;
  time: string;
  unread: number;
}

export interface Message {
  id: string;
  content: string;
  sender: 'me' | 'other';
  time: string;
  type: 'text' | 'image';
  imageUrl?: string;
}

// TODO: Replace with real data from API
const chats: Chat[] = [];
const messages: Message[] = [];

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeChat = chats.find((c) => c.id === selectedChat);

  const filteredChats = chats.filter(chat =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout showRightPanel={false}>
      <div className="h-[calc(100vh-80px)] flex">
        {/* Chat List */}
        <div className="w-80 border-r border-gray-100 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-dark mb-4">Messages</h2>
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

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 transition-colors text-left',
                    selectedChat === chat.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="relative">
                    <Avatar src={chat.user.avatar} alt={chat.user.name} size="md" />
                    {chat.user.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-dark truncate">{chat.user.name}</p>
                      <span className="text-xs text-gray-400 ml-2">{chat.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 bg-primary-400 text-white text-xs rounded-full flex items-center justify-center">
                      {chat.unread}
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

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Avatar alt={activeChat.user.name} size="md" />
                  <div>
                    <p className="font-semibold text-dark">{activeChat.user.name}</p>
                    <p className="text-sm text-gray-400">@{activeChat.user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                    <Phone size={20} className="text-gray-500" />
                  </button>
                  <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                    <Video size={20} className="text-gray-500" />
                  </button>
                  <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                    <MoreHorizontal size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn('flex', msg.sender === 'me' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%]',
                          msg.sender === 'me' ? 'items-end' : 'items-start'
                        )}
                      >
                        {msg.type === 'image' ? (
                          <div className={cn(
                            'rounded-2xl overflow-hidden',
                            msg.sender === 'me' ? 'rounded-br-md' : 'rounded-bl-md'
                          )}>
                            <img
                              src={msg.imageUrl}
                              alt="Shared image"
                              className="w-64 h-64 object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'px-4 py-3 rounded-2xl',
                              msg.sender === 'me'
                                ? 'bg-primary-400 text-white rounded-br-md'
                                : 'bg-white text-dark rounded-bl-md shadow-soft'
                            )}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        )}
                        <p
                          className={cn(
                            'text-[10px] mt-1 px-2',
                            msg.sender === 'me' ? 'text-right text-gray-400' : 'text-left text-gray-400'
                          )}
                        >
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500">Chưa có tin nhắn</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                    <Paperclip size={20} className="text-gray-400" />
                  </button>
                  <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                    <ImageIcon size={20} className="text-gray-400" />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                    <Smile size={20} className="text-gray-400" />
                  </button>
                  <button
                    className="p-3 bg-primary-400 hover:bg-primary-500 text-white rounded-xl transition-colors"
                    disabled={!message.trim()}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
