import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

// GET /api/users/following?user_id=xxx
// Lấy danh sách users mà user_id đang follow (kèm thông tin profile)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (useLocalDb) {
      const { query } = await import('@/lib/db');

      const result = await query(
        `SELECT
           u.id,
           u.username,
           u.display_name,
           u.avatar_url,
           u.is_online
         FROM follows f
         JOIN users u ON u.id = f.following_id
         WHERE f.follower_id = $1
           AND u.status = 'active'
         ORDER BY u.display_name ASC`,
        [userId]
      );

      return NextResponse.json({ users: result.rows });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('follows')
      .select(`
        following:users!follows_following_id_fkey(
          id, username, display_name, avatar_url, is_online
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching following users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch following users' },
        { status: 500 }
      );
    }

    const users = (data || [])
      .map((row: any) => row.following)
      .filter(Boolean);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in GET /api/users/following:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
