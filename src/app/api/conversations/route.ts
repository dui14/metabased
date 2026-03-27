import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();
      
      const result = await query(`
        SELECT 
          c.*,
          COALESCE(c.type, 'direct') as type,
          CASE 
            WHEN c.participant_1_id = $1 THEN u2.id
            ELSE u1.id
          END as other_user_id,
          CASE 
            WHEN c.participant_1_id = $1 THEN u2.username
            ELSE u1.username
          END as other_username,
          CASE 
            WHEN c.participant_1_id = $1 THEN u2.display_name
            ELSE u1.display_name
          END as other_display_name,
          CASE 
            WHEN c.participant_1_id = $1 THEN u2.avatar_url
            ELSE u1.avatar_url
          END as other_avatar_url,
          (
            SELECT COUNT(*)::int 
            FROM messages m 
            WHERE m.conversation_id = c.id 
              AND m.receiver_id = $1 
              AND m.is_read = false
          ) as unread_count
        FROM conversations c
        JOIN users u1 ON c.participant_1_id = u1.id
        JOIN users u2 ON c.participant_2_id = u2.id
        WHERE (c.participant_1_id = $1 OR c.participant_2_id = $1)
          AND COALESCE(c.type, 'direct') = 'direct'
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `, [userId]);

      return NextResponse.json({ conversations: result.rows });
    }


    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1:users!conversations_participant_1_id_fkey(id, username, display_name, avatar_url),
        participant_2:users!conversations_participant_2_id_fkey(id, username, display_name, avatar_url)
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    const conversations = data.map((conv: any) => {
      const otherUser = conv.participant_1_id === userId ? conv.participant_2 : conv.participant_1;
      return {
        ...conv,
        other_user_id: otherUser.id,
        other_username: otherUser.username,
        other_display_name: otherUser.display_name,
        other_avatar_url: otherUser.avatar_url,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error in GET /api/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, other_user_id } = body;

    if (!user_id || !other_user_id) {
      return NextResponse.json(
        { error: 'user_id and other_user_id are required' },
        { status: 400 }
      );
    }

    if (user_id === other_user_id) {
      return NextResponse.json(
        { error: 'Cannot create conversation with yourself' },
        { status: 400 }
      );
    }

    const [participant1, participant2] = [user_id, other_user_id].sort();

    if (useLocalDb) {
      const query = await getLocalDbQuery();
      
      const existingResult = await query(
        `SELECT * FROM conversations 
         WHERE participant_1_id = $1 AND participant_2_id = $2`,
        [participant1, participant2]
      );

      if (existingResult.rows.length > 0) {
        return NextResponse.json({ conversation: existingResult.rows[0] });
      }

      try {
        const insertResult = await query(
          `INSERT INTO conversations (participant_1_id, participant_2_id)
           VALUES ($1, $2)
           RETURNING *`,
          [participant1, participant2]
        );

        return NextResponse.json({ conversation: insertResult.rows[0] });
      } catch (insertError: any) {
        if (insertError.code === '23505') {
          const retryResult = await query(
            `SELECT * FROM conversations 
             WHERE participant_1_id = $1 AND participant_2_id = $2`,
            [participant1, participant2]
          );
          if (retryResult.rows.length > 0) {
            return NextResponse.json({ conversation: retryResult.rows[0] });
          }
        }
        throw insertError;
      }
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_1_id', participant1)
      .eq('participant_2_id', participant2)
      .single();

    if (existing) {
      return NextResponse.json({ conversation: existing });
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: participant1,
        participant_2_id: participant2,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: retryData } = await supabase
          .from('conversations')
          .select('*')
          .eq('participant_1_id', participant1)
          .eq('participant_2_id', participant2)
          .single();
        
        if (retryData) {
          return NextResponse.json({ conversation: retryData });
        }
      }
      
      console.error('Error creating conversation:', error);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error('Error in POST /api/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
