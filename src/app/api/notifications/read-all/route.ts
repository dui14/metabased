import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { markAllNotificationsAsRead } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updated_count = await markAllNotificationsAsRead(user.id);
    return NextResponse.json({ updated_count });
  } catch (error) {
    console.error('Error in PATCH /api/notifications/read-all:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
