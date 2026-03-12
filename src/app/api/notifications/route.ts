import { NextRequest, NextResponse } from 'next/server';
import {
  listNotifications,
  markNotificationRead,
  getUnreadNotificationCount,
} from '@/lib/notifications';
import { getAuthenticatedUserId } from '@/lib/auth-user';
import {
  cacheOrFetch,
  deleteCache,
  deleteCacheByPrefix,
  CACHE_KEYS,
  CACHE_TTL,
} from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') === 'unread' ? 'unread' : 'all';
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const listCacheKey = `${CACHE_KEYS.USER_NOTIFICATIONS(userId)}:${filter}:${limit}:${offset}`;
    const unreadCacheKey = CACHE_KEYS.USER_NOTIFICATIONS_UNREAD(userId);

    const notifications = await cacheOrFetch(
      listCacheKey,
      () => listNotifications(userId, { filter, limit, offset }),
      { ttl: CACHE_TTL.SHORT }
    );

    const unreadCount = await cacheOrFetch(
      unreadCacheKey,
      () => getUnreadNotificationCount(userId),
      { ttl: CACHE_TTL.SHORT }
    );

    return NextResponse.json(
      {
        notifications,
        unread_count: unreadCount,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const notificationId = body?.notification_id as string | undefined;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notification_id is required' },
        { status: 400 }
      );
    }

    const success = await markNotificationRead(userId, notificationId);
    if (!success) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    deleteCacheByPrefix(CACHE_KEYS.USER_NOTIFICATIONS(userId));
    deleteCache(CACHE_KEYS.USER_NOTIFICATIONS_UNREAD(userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
