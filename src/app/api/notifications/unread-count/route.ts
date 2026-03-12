import { NextRequest, NextResponse } from 'next/server';
import { getUnreadNotificationCount } from '@/lib/notifications';
import { getAuthenticatedUserId } from '@/lib/auth-user';
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = CACHE_KEYS.USER_NOTIFICATIONS_UNREAD(userId);
    const unreadCount = await cacheOrFetch(
      cacheKey,
      () => getUnreadNotificationCount(userId),
      { ttl: CACHE_TTL.SHORT }
    );

    return NextResponse.json({ unread_count: unreadCount });
  } catch (error) {
    console.error('Error in GET /api/notifications/unread-count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
