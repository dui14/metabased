import { NextRequest, NextResponse } from 'next/server';
import { userQueries } from '@/lib/supabase';
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/users/trending
// Lấy danh sách users được follow nhiều nhất (cached 5 phút)
export async function GET(request: NextRequest) {
  try {
    // Cache trending users vì data này ít thay đổi
    const users = await cacheOrFetch(
      CACHE_KEYS.TRENDING_USERS,
      async () => {
        return await userQueries.getTrending(5);
      },
      { ttl: CACHE_TTL.MEDIUM } // 5 phút
    );

    return NextResponse.json(
      { users },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/users/trending:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
