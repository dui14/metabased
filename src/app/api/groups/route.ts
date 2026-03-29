import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

async function getLocalDbQuery() {
  const { query } = await import('@/lib/db');
  return query;
}

async function getLocalDbClient() {
  const { getClient } = await import('@/lib/db');
  return getClient();
}

// POST: tạo group mới + conversation liên kết
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, avatar_url, created_by, member_ids } = body;

    if (!name || !created_by || !member_ids || !Array.isArray(member_ids)) {
      return NextResponse.json(
        { error: 'name, created_by, and member_ids[] are required' },
        { status: 400 }
      );
    }

    // Đảm bảo creator nằm trong danh sách members
    const allMembers = Array.from(new Set([created_by, ...member_ids]));

    if (useLocalDb) {
      const client = await getLocalDbClient();

      try {
        await client.query('BEGIN');

        // 1. Tạo group
        const groupResult = await client.query(
          `INSERT INTO chat_groups (name, avatar_url, created_by)
           VALUES ($1, $2, $3) RETURNING *`,
          [name, avatar_url || null, created_by]
        );
        const group = groupResult.rows[0];

        // 2. Thêm members (creator = admin, còn lại = member)
        for (const memberId of allMembers) {
          const role = memberId === created_by ? 'admin' : 'member';
          await client.query(
            `INSERT INTO chat_group_members (group_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [group.id, memberId, role]
          );
        }

        // 3. Tạo conversation type='group' liên kết với group
        // participant_2_id = NULL vì group không có cặp participant cố định
        const convResult = await client.query(
          `INSERT INTO conversations (participant_1_id, participant_2_id, type, group_id)
           VALUES ($1, NULL, 'group', $2) RETURNING *`,
          [created_by, group.id]
        );

        await client.query('COMMIT');

        return NextResponse.json({
          group,
          conversation: convResult.rows[0],
          members: allMembers,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Supabase: tạo group
    const { data: group, error: groupError } = await supabase
      .from('chat_groups')
      .insert({ name, avatar_url: avatar_url || null, created_by })
      .select()
      .single();

    if (groupError || !group) {
      console.error('Error creating group:', groupError);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    // Thêm members
    const memberInserts = allMembers.map((uid: string) => ({
      group_id: group.id,
      user_id: uid,
      role: uid === created_by ? 'admin' : 'member',
    }));

    await supabase.from('chat_group_members').insert(memberInserts);

    // Tạo conversation
    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: created_by,
        participant_2_id: null,
        type: 'group',
        group_id: group.id,
      })
      .select()
      .single();

    return NextResponse.json({ group, conversation: conv, members: allMembers });
  } catch (error) {
    console.error('Error in POST /api/groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: lấy danh sách groups của user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();

      const result = await query(
        `SELECT
           g.*,
           c.id as conversation_id,
           c.last_message_at,
           (
             SELECT COUNT(*)::int FROM chat_group_members
             WHERE group_id = g.id
           ) as member_count
         FROM chat_groups g
         JOIN chat_group_members gm ON gm.group_id = g.id
         LEFT JOIN conversations c ON c.group_id = g.id AND c.type = 'group'
         WHERE gm.user_id = $1
         ORDER BY c.last_message_at DESC NULLS LAST, g.created_at DESC`,
        [userId]
      );

      return NextResponse.json({ groups: result.rows });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Lấy group_ids user là member
    const { data: memberships } = await supabase
      .from('chat_group_members')
      .select('group_id')
      .eq('user_id', userId);

    const groupIds = (memberships || []).map((m: any) => m.group_id);

    if (groupIds.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const { data: groups, error } = await supabase
      .from('chat_groups')
      .select('*')
      .in('id', groupIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching groups:', error);
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    return NextResponse.json({ groups: groups || [] });
  } catch (error) {
    console.error('Error in GET /api/groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
