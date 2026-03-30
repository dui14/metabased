import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';

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
    const conversationId = searchParams.get('conversation_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();
      
      const result = await query(`
        SELECT 
          m.*,
          sender.id as sender_id,
          sender.username as sender_username,
          sender.display_name as sender_display_name,
          sender.avatar_url as sender_avatar_url
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `, [conversationId, limit, offset]);

      return NextResponse.json({ 
        messages: result.rows.reverse()
      });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data.reverse() });
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, sender_id, receiver_id, content, message_type = 'text' } = body;
    const isGroupMessage = !receiver_id; // group messages have no specific receiver

    if (!conversation_id || !sender_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();

      // Chi check message_permission cho DM (không check cho group messages)
      if (!isGroupMessage) {
        const receiverResult = await query(`
          SELECT message_permission FROM users WHERE id = $1
        `, [receiver_id]);

        if (receiverResult.rows.length === 0) {
          return NextResponse.json(
            { error: 'Receiver not found' },
            { status: 404 }
          );
        }

        const messagePermission = receiverResult.rows[0].message_permission || 'everyone';

        if (messagePermission === 'following') {
          const followResult = await query(`
            SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2
          `, [receiver_id, sender_id]);

          if (followResult.rows.length === 0) {
            return NextResponse.json(
              { error: 'You can only send messages to users you follow' },
              { status: 403 }
            );
          }
        }
      }

      const { getClient } = await import('@/lib/db');
      const client = await getClient();

      try {
        await client.query('BEGIN');

        const messageResult = await client.query(`
          INSERT INTO messages (conversation_id, sender_id, receiver_id, content, message_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [conversation_id, sender_id, receiver_id ?? null, content, message_type]);

        const message = messageResult.rows[0];

        await client.query(`
          UPDATE conversations
          SET last_message_id = $1,
              last_message_at = $2,
              updated_at = $2
          WHERE id = $3
        `, [message.id, message.created_at, conversation_id]);

        await client.query('COMMIT');

        // Notifications: DM → gửi cho receiver; Group → gửi cho tất cả members trừ sender
        try {
          if (!isGroupMessage) {
            await createNotification({
              userId: receiver_id,
              actorId: sender_id,
              type: 'message',
              title: 'New message',
              message: 'sent you a message',
              referenceType: 'conversation',
              referenceId: conversation_id,
            });
          } else {
            // Lấy conversation để tìm group_id
            const convResult = await query(
              `SELECT group_id FROM conversations WHERE id = $1`,
              [conversation_id]
            );
            const groupId = convResult.rows[0]?.group_id;
            if (groupId) {
              const membersResult = await query(
                `SELECT user_id FROM chat_group_members WHERE group_id = $1 AND user_id != $2`,
                [groupId, sender_id]
              );
              for (const member of membersResult.rows) {
                await createNotification({
                  userId: member.user_id,
                  actorId: sender_id,
                  type: 'message',
                  title: 'New group message',
                  message: 'sent a message in a group',
                  referenceType: 'conversation',
                  referenceId: conversation_id,
                }).catch(() => {});
              }
            }
          }
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
        }

        const senderResult = await query(`
          SELECT id, username, display_name, avatar_url FROM users WHERE id = $1
        `, [sender_id]);

        return NextResponse.json({
          message: {
            ...message,
            sender: senderResult.rows[0],
          },
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
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    if (!isGroupMessage) {
      const { data: receiver } = await supabase
        .from('users')
        .select('message_permission')
        .eq('id', receiver_id)
        .single();

      if (!receiver) {
        return NextResponse.json(
          { error: 'Receiver not found' },
          { status: 404 }
        );
      }

      const messagePermission = receiver.message_permission || 'everyone';

      if (messagePermission === 'following') {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', receiver_id)
          .eq('following_id', sender_id)
          .single();

        if (!followData) {
          return NextResponse.json(
            { error: 'This user only accepts messages from people they follow' },
            { status: 403 }
          );
        }
      }
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id,
        receiver_id,
        content,
        message_type,
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, display_name, avatar_url)
      `)
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      );
    }

    await supabase
      .from('conversations')
      .update({
        last_message_id: message.id,
        last_message_at: message.created_at,
      })
      .eq('id', conversation_id);

    try {
      await createNotification({
        userId: receiver_id,
        actorId: sender_id,
        type: 'message',
        title: 'New message',
        message: 'sent you a message',
        referenceType: 'conversation',
        referenceId: conversation_id,
      });
    } catch (notificationError) {
      console.error('Error creating message notification:', notificationError);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, user_id } = body;

    if (!conversation_id || !user_id) {
      return NextResponse.json(
        { error: 'conversation_id and user_id are required' },
        { status: 400 }
      );
    }

    if (useLocalDb) {
      const query = await getLocalDbQuery();

      // Kiểm tra conversation type
      const convResult = await query(
        `SELECT type FROM conversations WHERE id = $1`,
        [conversation_id]
      );
      const convType = convResult.rows[0]?.type || 'direct';

      if (convType === 'group') {
        // Group: insert read receipt vào message_read_status cho tất cả tin nhắn chưa đọc
        // (tin nhắn trong group conversation này, không phải do user gửi)
        await query(`
          INSERT INTO message_read_status (message_id, user_id)
          SELECT m.id, $1
          FROM messages m
          WHERE m.conversation_id = $2
            AND m.sender_id != $1
            AND NOT EXISTS (
              SELECT 1 FROM message_read_status mrs
              WHERE mrs.message_id = m.id AND mrs.user_id = $1
            )
          ON CONFLICT (message_id, user_id) DO NOTHING
        `, [user_id, conversation_id]);
      } else {
        // DM: update is_read trên message trực tiếp
        await query(`
          UPDATE messages
          SET is_read = true
          WHERE conversation_id = $1
            AND receiver_id = $2
            AND is_read = false
        `, [conversation_id, user_id]);
      }

      return NextResponse.json({ success: true });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Check conversation type
    const { data: conv } = await supabase
      .from('conversations')
      .select('type')
      .eq('id', conversation_id)
      .single();

    const convType = conv?.type || 'direct';

    if (convType === 'group') {
      // Lấy tất cả messages chưa đọc trong group (không phải do user gửi)
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversation_id)
        .neq('sender_id', user_id);

      if (unreadMessages && unreadMessages.length > 0) {
        // Upsert read receipts
        const readReceipts = unreadMessages.map((m: any) => ({
          message_id: m.id,
          user_id,
        }));
        await supabase
          .from('message_read_status')
          .upsert(readReceipts, { onConflict: 'message_id,user_id' });
      }
    } else {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversation_id)
        .eq('receiver_id', user_id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json(
          { error: 'Failed to mark messages as read' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in PATCH /api/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
