import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const useLocalDb = process.env.USE_LOCAL_DB === 'true';

async function getLocalDbQuery() {
  const { query } = await import('@/lib/db');
  return query;
}

function isMissingColumnError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === '42703';
}

// GET: lấy unread message count cho user (cả DM + group)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();

      try {
        // Preferred schema: conversations.group_id exists
        const dmResult = await query(
          `SELECT COUNT(*)::int as count
           FROM messages m
           JOIN conversations c ON c.id = m.conversation_id
           WHERE c.group_id IS NULL
             AND m.receiver_id = $1
             AND m.is_read = false`,
          [userId]
        );

        const groupResult = await query(
          `SELECT COUNT(*)::int as count
           FROM messages m
           JOIN conversations c ON c.id = m.conversation_id
           JOIN chat_group_members gm ON gm.group_id = c.group_id
           WHERE c.group_id IS NOT NULL
             AND gm.user_id = $1
             AND m.sender_id != $1
             AND NOT EXISTS (
               SELECT 1 FROM message_read_status mrs
               WHERE mrs.message_id = m.id AND mrs.user_id = $1
             )`,
          [userId]
        );

        const total = (dmResult.rows[0]?.count || 0) + (groupResult.rows[0]?.count || 0);
        return NextResponse.json({ unread_count: total });
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }

        // Legacy schema fallback: count DM unread directly from messages only.
        const dmFallback = await query(
          `SELECT COUNT(*)::int as count
           FROM messages
           WHERE receiver_id = $1
             AND is_read = false`,
          [userId]
        );

        return NextResponse.json({ unread_count: dmFallback.rows[0]?.count || 0 });
      }
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Supabase: sử dụng RPC function hoặc query trực tiếp
    // DM unread
    const { count: dmCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    return NextResponse.json({ unread_count: dmCount || 0 });
  } catch (error) {
    console.error('Error in GET /api/messages/unread-count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
