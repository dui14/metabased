'use client';

import { cn } from '@/lib/utils';
import { Avatar, Input } from '@/components/common';
import { Send, Search, MoreHorizontal, Phone, Video } from 'lucide-react';
import { useState } from 'react';

interface Chat {
  id: string;
  user: {
    name: string;
    avatar?: string;
    online: boolean;
  };
  lastMessage: string;
  time: string;
  unread: number;
}

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'other';
  time: string;
}

// TODO: Fetch real chats and messages from API
const mockChats: Chat[] = [];
const mockMessages: Message[] = [];

const RightPanel = () => {
  const [selectedChat, setSelectedChat] = useState<string>('1');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeChat = mockChats.find((c) => c.id === selectedChat);

  return (
    <aside className="fixed right-0 top-0 h-screen w-[25%] border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-colors z-50 hidden lg:flex">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-dark dark:text-white mb-3">Messages</h2>
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

      {/* Chat List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="h-[40%] overflow-y-auto border-b border-gray-100 dark:border-gray-800">
          {mockChats.length > 0 ? (
            mockChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 transition-colors text-left',
                  selectedChat === chat.id
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <div className="relative">
                  <Avatar src={chat.user.avatar} alt={chat.user.name} size="md" />
                  {chat.user.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-dark dark:text-white truncate">
                      {chat.user.name}
                    </p>
                    <span className="text-xs text-gray-400">{chat.time}</span>
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
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <p className="text-gray-400 text-sm">Chưa có cuộc trò chuyện</p>
            </div>
          )}
        </div>

        {/* Active Chat */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          {activeChat && (
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar alt={activeChat.user.name} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-dark dark:text-white">{activeChat.user.name}</p>
                  <p className="text-xs text-green-500">
                    {activeChat.user.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Phone size={18} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Video size={18} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <MoreHorizontal size={18} className="text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mockMessages.length > 0 ? (
              mockMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.sender === 'me' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] px-4 py-2 rounded-2xl',
                      msg.sender === 'me'
                        ? 'bg-primary-400 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-dark dark:text-white rounded-bl-md'
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={cn(
                        'text-[10px] mt-1',
                        msg.sender === 'me' ? 'text-white/70' : 'text-gray-400'
                      )}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-gray-400 text-sm">Chưa có tin nhắn</p>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
              <button className="p-2.5 bg-primary-400 hover:bg-primary-500 text-white rounded-xl transition-colors">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightPanel;
