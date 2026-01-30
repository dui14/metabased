import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

async function getLocalDbQuery() {
  const { query } = await import('@/lib/db');
  return query;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    
    const cacheKey = `${CACHE_KEYS.DISCOVER_USERS}:${limit}:${offset}:${search}`;
    
    const users = await cacheOrFetch(
      cacheKey,
      async () => {
        if (useLocalDb) {
          const query = await getLocalDbQuery();
          
          let sql = `
            SELECT id, username, display_name, bio, avatar_url, followers_count
            FROM users
            WHERE status = 'active' AND is_profile_complete = true
          `;
          const params: any[] = [];
          
          if (search) {
            sql += ` AND (username ILIKE $1 OR display_name ILIKE $1)`;
            params.push(`%${search}%`);
          }
          
          sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
          params.push(limit, offset);
          
          const result = await query(sql, params);
          return result.rows || [];
        }
        
        const supabase = createServerSupabaseClient();
        if (!supabase) {
          console.error('Supabase client is null');
          return [];
        }
        
        let queryBuilder = supabase
          .from('users')
          .select('id, username, display_name, bio, avatar_url, followers_count')
          .eq('status', 'active')
          .eq('is_profile_complete', true);
        
        if (search) {
          queryBuilder = queryBuilder.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
        }
        
        const { data, error } = await queryBuilder
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Error fetching discover users:', error);
          throw error;
        }
        
        return data || [];
      },
      { ttl: CACHE_TTL.SHORT * 4 }
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
      { error: 'Internal server error', users: [] },
      { status: 500 }
    );
  }
}
