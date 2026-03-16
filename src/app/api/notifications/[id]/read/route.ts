import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { markNotificationAsRead } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = context.params.id;
    const status = await markNotificationAsRead({
      userId: user.id,
      notificationId,
    });

    if (status === 'not_found') {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (status === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/notifications/[id]/read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
