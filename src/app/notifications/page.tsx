'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Avatar, Button } from '@/components/common';
import {
  Heart,
  MessageCircle,
  UserPlus,
  Sparkles,
  ShoppingCart,
  Check,
  Bell,
  Loader2,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'nft_sold'
  | 'nft_offer'
  | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string | null;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'like':
      return <Heart size={18} className="text-red-500" fill="currentColor" />;
    case 'comment':
      return <MessageCircle size={18} className="text-primary-500" />;
    case 'follow':
      return <UserPlus size={18} className="text-green-500" />;
    case 'nft_sold':
      return <ShoppingCart size={18} className="text-purple-500" />;
    case 'nft_offer':
      return <Sparkles size={18} className="text-primary-500" />;
    case 'system':
      return <Info size={18} className="text-blue-500" />;
    default:
      return <MessageCircle size={18} className="text-gray-500" />;
  }
};

const getNotificationText = (notification: Notification): string => {
  if (notification.message) {
    return notification.message;
  }

  switch (notification.type) {
    case 'like':
      return 'liked your post';
    case 'comment':
      return 'commented on your post';
    case 'follow':
      return 'started following you';
    case 'nft_sold':
      return 'bought your NFT';
    case 'nft_offer':
      return 'made an offer on your NFT';
    case 'system':
      return notification.title || 'sent you an update';
    default:
      return 'interacted with your content';
  }
};

const getNotificationHref = (notification: Notification): string => {
  if (notification.reference_type === 'post' && notification.reference_id) {
    return `/post/${notification.reference_id}`;
  }

  if (notification.reference_type === 'user' && notification.actor?.username) {
    return `/user/${notification.actor.username}`;
  }

  if (notification.reference_type === 'conversation') {
    return '/messages';
  }

  if (notification.actor?.username) {
    return `/user/${notification.actor.username}`;
  }

  return '/notifications';
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = async (activeFilter: 'all' | 'unread') => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notifications?filter=${activeFilter}&limit=50`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load notifications');
      }

      const data: NotificationsResponse = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(filter);
  }, [filter]);

  const handleMarkOneRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_id: notificationId }),
      });

      if (!response.ok) {
        return;
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      if (filter === 'unread') {
        setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true);
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      if (filter === 'unread') {
        setNotifications([]);
      } else {
        setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      }
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };

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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || isMarkingAll}
            >
              <Check size={16} className="mr-1" />
              {isMarkingAll ? 'Marking...' : 'Mark all read'}
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
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`${!notification.is_read ? 'bg-primary-50/50 border-primary-100' : ''}`}
                hover
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar
                      src={notification.actor?.avatar_url || undefined}
                      alt={notification.actor?.display_name || notification.actor?.username || 'User'}
                      size="md"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-soft">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-dark">
                      <Link
                        href={getNotificationHref(notification)}
                        className="font-semibold hover:underline"
                      >
                        {notification.actor?.display_name || notification.actor?.username || 'Someone'}
                      </Link>{' '}
                      {getNotificationText(notification)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkOneRead(notification.id)}
                      className="w-2 h-2 bg-primary-400 rounded-full mt-2"
                      title="Mark as read"
                    />
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
