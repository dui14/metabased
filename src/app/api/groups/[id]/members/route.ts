import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

async function getLocalDbQuery() {
  const { query } = await import('@/lib/db');
  return query;
}

// POST: thêm member vào group (chỉ admin)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const body = await request.json();
    const { user_id, member_id } = body;

    if (!user_id || !member_id) {
      return NextResponse.json(
        { error: 'user_id (admin) and member_id are required' },
        { status: 400 }
      );
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
        return NextResponse.json({ error: 'Only admins can add members' }, { status: 403 });
      }

      // Thêm member
      try {
        const result = await query(
          `INSERT INTO chat_group_members (group_id, user_id, role)
           VALUES ($1, $2, 'member') RETURNING *`,
          [groupId, member_id]
        );
        return NextResponse.json({ member: result.rows[0] });
      } catch (err: any) {
        if (err.code === '23505') {
          return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
        }
        throw err;
      }
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
      return NextResponse.json({ error: 'Only admins can add members' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('chat_group_members')
      .insert({ group_id: groupId, user_id: member_id, role: 'member' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    return NextResponse.json({ member: data });
  } catch (error) {
    console.error('Error in POST /api/groups/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: xóa member hoặc tự rời nhóm
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id'); // người thao tác
    const memberId = searchParams.get('member_id'); // người bị xóa

    if (!userId || !memberId) {
      return NextResponse.json(
        { error: 'user_id and member_id are required' },
        { status: 400 }
      );
    }

    const isSelf = userId === memberId; // rời nhóm

    if (useLocalDb) {
      const query = await getLocalDbQuery();

      if (!isSelf) {
        // Kick member: cần quyền admin
        const adminCheck = await query(
          `SELECT 1 FROM chat_group_members
           WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
          [groupId, userId]
        );

        if (adminCheck.rows.length === 0) {
          return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
        }
      }

      // Không cho creator rời nhóm (phải xóa group)
      const creatorCheck = await query(
        `SELECT 1 FROM chat_groups WHERE id = $1 AND created_by = $2`,
        [groupId, memberId]
      );

      if (creatorCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Creator cannot leave group. Delete the group instead.' },
          { status: 400 }
        );
      }

      await query(
        `DELETE FROM chat_group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, memberId]
      );

      return NextResponse.json({ success: true });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!isSelf) {
      const { data: adminData } = await supabase
        .from('chat_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (!adminData) {
        return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
      }
    }

    // Check creator
    const { data: group } = await supabase
      .from('chat_groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (group?.created_by === memberId) {
      return NextResponse.json(
        { error: 'Creator cannot leave group. Delete the group instead.' },
        { status: 400 }
      );
    }

    await supabase
      .from('chat_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/groups/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
