import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { createServerSupabaseClient } from '@/lib/supabase';
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

// GET /api/users/discover
// Lấy danh sách users để khám phá (cached 2 phút)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Cache key dựa trên params
    const cacheKey = `${CACHE_KEYS.DISCOVER_USERS}:${limit}:${offset}`;
    
    const users = await cacheOrFetch(
      cacheKey,
      async () => {
        const supabase = createServerSupabaseClient()!;
        const { data, error } = await supabase
          .from('users')
          .select('id, username, display_name, bio, avatar_url, followers_count')
          .eq('status', 'active')
          .eq('is_profile_complete', true)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Error fetching discover users:', error);
          throw error;
        }
        
        return data || [];
      },
      { ttl: CACHE_TTL.SHORT * 4 } // 2 phút
    );

    return NextResponse.json(
      { users },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/users/discover:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
