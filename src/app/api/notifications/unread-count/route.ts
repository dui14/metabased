import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getNotificationUnreadCount } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unread_count = await getNotificationUnreadCount(user.id);
    return NextResponse.json({ unread_count });
  } catch (error) {
    console.error('Error in GET /api/notifications/unread-count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
