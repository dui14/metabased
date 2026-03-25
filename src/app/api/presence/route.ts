import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getPresenceForUsers } from '@/lib/presence';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ids = (request.nextUrl.searchParams.get('user_ids') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ presence: {} });
    }

    return NextResponse.json({ presence: getPresenceForUsers(ids) });
  } catch (error) {
    console.error('Error in GET /api/presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
