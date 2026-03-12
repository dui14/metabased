import { NextRequest, NextResponse } from 'next/server';
import { markAllNotificationsRead } from '@/lib/notifications';
import { getAuthenticatedUserId } from '@/lib/auth-user';
import { deleteCache, deleteCacheByPrefix, CACHE_KEYS } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updatedCount = await markAllNotificationsRead(userId);

    deleteCacheByPrefix(CACHE_KEYS.USER_NOTIFICATIONS(userId));
    deleteCache(CACHE_KEYS.USER_NOTIFICATIONS_UNREAD(userId));

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
    });
  } catch (error) {
    console.error('Error in PATCH /api/notifications/read-all:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
