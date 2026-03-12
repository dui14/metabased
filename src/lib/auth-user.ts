import 'server-only';

import { NextRequest } from 'next/server';
import { verifyAndGetUser } from '@/lib/jwt';
import { getUserIdByWallet } from '@/lib/notifications';

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  // Dev-only bypass: pass X-Dev-User-Id header with a valid user UUID.
  // Never enabled in production.
  if (process.env.NODE_ENV === 'development') {
    const devUserId = request.headers.get('x-dev-user-id');
    if (devUserId) {
      return devUserId;
    }
  }

  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    token = request.cookies.get('dynamic_authentication_token')?.value || null;
  }

  if (!token) {
    return null;
  }

  const userInfo = await verifyAndGetUser(token);
  if (!userInfo?.walletAddress) {
    return null;
  }

  return getUserIdByWallet(userInfo.walletAddress);
}
