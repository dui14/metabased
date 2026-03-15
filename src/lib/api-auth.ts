import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { verifyAndGetUser } from '@/lib/jwt';

export interface AuthenticatedUser {
  id: string;
  role: string;
  wallet_address: string;
}

function normalizeToken(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const token = value.trim();
  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }

  return token;
}

function getBearerToken(authHeader?: string | null): string | null {
  const normalized = normalizeToken(authHeader);
  if (!normalized) {
    return null;
  }

  const parts = normalized.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return normalizeToken(parts[1]);
  }

  return null;
}

async function findUserByWalletAddress(walletAddress: string): Promise<AuthenticatedUser | null> {
  const useLocalDb = isUsingLocalDb();

  if (useLocalDb) {
    const { query } = await import('@/lib/db');
    const result = await query(
      'SELECT id, role, wallet_address FROM users WHERE wallet_address = $1 LIMIT 1',
      [walletAddress.toLowerCase()]
    );
    return (result.rows[0] as AuthenticatedUser | undefined) || null;
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from('users')
    .select('id, role, wallet_address')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  return (data as AuthenticatedUser | null) || null;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  const headerToken = getBearerToken(authHeader);
  const cookieToken = normalizeToken(request.cookies.get('dynamic_authentication_token')?.value);
  const tokens = [headerToken, cookieToken].filter((token): token is string => Boolean(token));

  for (const token of tokens) {
    const userInfo = await verifyAndGetUser(token);
    const walletAddress = userInfo?.walletAddress;

    if (!walletAddress) {
      continue;
    }

    const user = await findUserByWalletAddress(walletAddress);
    if (user) {
      return user;
    }
  }

  return null;
}
