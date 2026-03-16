'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, Avatar, Button } from '@/components/common';
import { Heart, MessageCircle, UserPlus, Check, Settings, Bell, Repeat2, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { emitNotificationsUpdated } from '@/lib/useNotificationUnreadCount';

type NotificationType = 'follow' | 'like' | 'repost' | 'comment' | 'message';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string | null;
  message: string | null;
  created_at: string;
  is_read: boolean;
  actor: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface NotificationsResponse {
  items: NotificationItem[];
  next_cursor: string | null;
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
    case 'repost':
      return <Repeat2 size={18} className="text-amber-500" />;
    case 'message':
      return <MessageSquare size={18} className="text-blue-500" />;
    default:
      return <Bell size={18} className="text-gray-500" />;
  }
};

const getNotificationText = (notification: NotificationItem): string => {
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
    case 'repost':
      return 'reposted your post';
    case 'message':
      return 'sent you a message';
    default:
      return 'interacted with your content';
  }
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=50', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        setNotifications([]);
        return;
      }

      const data = (await response.json()) as NotificationsResponse;
      setNotifications(Array.isArray(data.items) ? data.items : []);
      emitNotificationsUpdated();
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.map((item) => (
      item.id === notificationId ? { ...item, is_read: true } : item
    )));

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        await fetchNotifications();
      } else {
        emitNotificationsUpdated();
      }
    } catch {
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAll(true);

    const previous = notifications;
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));

    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        setNotifications(previous);
      } else {
        emitNotificationsUpdated();
      }
    } catch {
      setNotifications(previous);
    } finally {
      setIsMarkingAll(false);
    }
  }, [notifications]);

  const filteredNotifications = useMemo(
    () => notifications.filter((n) => (filter === 'all' ? true : !n.is_read)),
    [filter, notifications]
  );

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={isMarkingAll || unreadCount === 0} onClick={handleMarkAllRead}>
              <Check size={16} className="mr-1" />
              Mark all read
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <Settings size={16} />
            </Button>
          </div>
        </div>

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

        <div className="space-y-2">
          {!isLoading && filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`${!notification.is_read ? 'bg-primary-50/50 border-primary-100' : ''}`}
                hover
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    if (!notification.is_read) {
                      void handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar src={notification.actor?.avatar_url || undefined} alt={notification.actor?.display_name || 'User'} size="md" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-soft">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-dark break-words">
                        {notification.actor?.username ? (
                          <Link href={`/user/${notification.actor.username}`} className="font-semibold hover:underline">
                            {notification.actor.display_name || notification.actor.username}
                          </Link>
                        ) : (
                          <span className="font-semibold">Someone</span>
                        )}{' '}
                        {getNotificationText(notification)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-primary-400 rounded-full mt-2" />
                    )}
                  </div>
                </button>
              </Card>
            ))
          ) : (
            <Card className="text-center py-12">
              <Bell size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">
                {isLoading ? 'Đang tải thông báo...' : 'Chưa có thông báo'}
              </p>
              {!isLoading && (
                <p className="text-gray-400 text-sm mt-1">Thông báo sẽ hiển thị khi có hoạt động mới</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
