import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

async function getLocalDbQuery() {
  const { query } = await import('@/lib/db');
  return query;
}

// GET: lấy thông tin group + members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;

    if (useLocalDb) {
      const query = await getLocalDbQuery();

      const groupResult = await query(
        `SELECT * FROM chat_groups WHERE id = $1`,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      const membersResult = await query(
        `SELECT
           gm.*,
           u.username, u.display_name, u.avatar_url, u.is_online, u.last_seen_at
         FROM chat_group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1
         ORDER BY gm.role DESC, gm.joined_at ASC`,
        [groupId]
      );

      return NextResponse.json({
        group: groupResult.rows[0],
        members: membersResult.rows,
      });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: group, error } = await supabase
      .from('chat_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const { data: members } = await supabase
      .from('chat_group_members')
      .select(`
        *,
        user:users(id, username, display_name, avatar_url, is_online, last_seen_at)
      `)
      .eq('group_id', groupId)
      .order('role', { ascending: false })
      .order('joined_at', { ascending: true });

    return NextResponse.json({ group, members: members || [] });
  } catch (error) {
    console.error('Error in GET /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: cập nhật group (chỉ admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const body = await request.json();
    const { user_id, name, avatar_url } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();

      // Kiểm tra quyền admin
      const adminCheck = await query(
        `SELECT 1 FROM chat_group_members
         WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
        [groupId, user_id]
      );

      if (adminCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Only admins can update group' }, { status: 403 });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(name);
      }
      if (avatar_url !== undefined) {
        updates.push(`avatar_url = $${idx++}`);
        values.push(avatar_url);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
      }

      values.push(groupId);
      const result = await query(
        `UPDATE chat_groups SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      return NextResponse.json({ group: result.rows[0] });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Kiểm tra admin
    const { data: adminData } = await supabase
      .from('chat_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user_id)
      .eq('role', 'admin')
      .single();

    if (!adminData) {
      return NextResponse.json({ error: 'Only admins can update group' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from('chat_groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }

    return NextResponse.json({ group: data });
  } catch (error) {
    console.error('Error in PUT /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: xóa group (chỉ creator)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();

      // Chỉ creator mới được xóa group
      const creatorCheck = await query(
        `SELECT 1 FROM chat_groups WHERE id = $1 AND created_by = $2`,
        [groupId, userId]
      );

      if (creatorCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Only the creator can delete group' }, { status: 403 });
      }

      // CASCADE sẽ xóa members, messages (qua conversation)
      await query(`DELETE FROM chat_groups WHERE id = $1`, [groupId]);

      return NextResponse.json({ success: true });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: group } = await supabase
      .from('chat_groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (!group || group.created_by !== userId) {
      return NextResponse.json({ error: 'Only the creator can delete group' }, { status: 403 });
    }

    await supabase.from('chat_groups').delete().eq('id', groupId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
