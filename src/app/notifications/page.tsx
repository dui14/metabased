'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Avatar, Button, Badge } from '@/components/common';
import { Heart, MessageCircle, UserPlus, Sparkles, ShoppingCart, Check, Settings, Bell } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'nft_sold' | 'nft_minted' | 'mention';
  user: {
    username: string;
    display_name: string;
  };
  content?: string;
  post_id?: string;
  nft_id?: string;
  created_at: string;
  read: boolean;
}

// TODO: Replace with real data from API
const notifications: Notification[] = [];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'like':
      return <Heart size={18} className="text-red-500" fill="currentColor" />;
    case 'comment':
      return <MessageCircle size={18} className="text-primary-500" />;
    case 'follow':
      return <UserPlus size={18} className="text-green-500" />;
    case 'nft_sold':
      return <ShoppingCart size={18} className="text-purple-500" />;
    case 'nft_minted':
      return <Sparkles size={18} className="text-primary-500" />;
    default:
      return <MessageCircle size={18} className="text-gray-500" />;
  }
};

const getNotificationText = (notification: Notification): string => {
  switch (notification.type) {
    case 'like':
      return 'liked your post';
    case 'comment':
      return `commented: "${notification.content}"`;
    case 'follow':
      return 'started following you';
    case 'nft_sold':
      return 'bought your NFT';
    case 'nft_minted':
      return 'Your NFT was minted successfully';
    default:
      return 'interacted with your content';
  }
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) =>
    filter === 'all' ? true : !n.read
  );

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Check size={16} className="mr-1" />
              Mark all read
            </Button>
            <Button variant="ghost" size="sm">
              <Settings size={16} />
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-white text-dark shadow-soft' : 'text-gray-500'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread' ? 'bg-white text-dark shadow-soft' : 'text-gray-500'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`${!notification.read ? 'bg-primary-50/50 border-primary-100' : ''}`}
                hover
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar alt={notification.user.display_name} size="md" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-soft">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-dark">
                      <Link
                        href={`/user/${notification.user.username}`}
                        className="font-semibold hover:underline"
                      >
                        {notification.user.display_name}
                      </Link>{' '}
                      {getNotificationText(notification)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary-400 rounded-full" />
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card className="text-center py-12">
              <Bell size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Chưa có thông báo</p>
              <p className="text-gray-400 text-sm mt-1">Thông báo sẽ hiển thị khi có hoạt động mới</p>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
