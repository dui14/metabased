import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

async function getLocalDbQuery() {
  const { query } = await import('@/lib/db');
  return query;
}

// GET: lấy online status của danh sách users
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userIds = searchParams.get('user_ids');

    if (!userIds) {
      return NextResponse.json(
        { error: 'user_ids is required (comma-separated)' },
        { status: 400 }
      );
    }

    const ids = userIds.split(',').filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();
      // Tạo placeholders $1, $2, ...
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      const result = await query(
        `SELECT id, is_online, last_seen_at
         FROM users WHERE id IN (${placeholders})`,
        ids
      );

      const statuses: Record<string, { is_online: boolean; last_seen_at: string | null }> = {};
      for (const row of result.rows) {
        statuses[row.id] = {
          is_online: row.is_online || false,
          last_seen_at: row.last_seen_at || null,
        };
      }

      return NextResponse.json({ statuses });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, is_online, last_seen_at')
      .in('id', ids);

    if (error) {
      console.error('Error fetching online statuses:', error);
      return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
    }

    const statuses: Record<string, { is_online: boolean; last_seen_at: string | null }> = {};
    for (const row of data || []) {
      statuses[row.id] = {
        is_online: row.is_online || false,
        last_seen_at: row.last_seen_at || null,
      };
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Error in GET /api/users/online-status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: cập nhật online status cho user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, is_online } = body;

    if (!user_id || typeof is_online !== 'boolean') {
      return NextResponse.json(
        { error: 'user_id and is_online (boolean) are required' },
        { status: 400 }
      );
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();
      await query(
        `UPDATE users
         SET is_online = $1,
             last_seen_at = CASE WHEN $1 = false THEN NOW() ELSE last_seen_at END
         WHERE id = $2`,
        [is_online, user_id]
      );
      return NextResponse.json({ success: true });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const updateData: any = { is_online };
    if (!is_online) {
      updateData.last_seen_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id);

    if (error) {
      console.error('Error updating online status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/users/online-status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
