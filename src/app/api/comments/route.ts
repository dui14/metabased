import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { CACHE_KEYS, deleteCache, deleteCacheByPrefix } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('post_id');
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    if (!postId) {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    if (isUsingLocalDb()) {
      const { query } = await import('@/lib/db');
      const result = await query(
        `SELECT
           c.id,
           c.post_id,
           c.user_id,
           c.content,
           c.created_at,
           json_build_object(
             'id', u.id,
             'username', u.username,
             'display_name', u.display_name,
             'avatar_url', u.avatar_url
           ) AS user
         FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.post_id = $1
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [postId, limit, offset]
      );

      return NextResponse.json({ comments: result.rows.reverse() });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('comments')
      .select(
        `
        id,
        post_id,
        user_id,
        content,
        created_at,
        user:users!comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ comments: (data || []).reverse() });
  } catch (error) {
    console.error('Error in GET /api/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post_id, user_id, content, parent_id } = body;

    if (!post_id || !user_id || !content?.trim()) {
      return NextResponse.json(
        { error: 'post_id, user_id and content are required' },
        { status: 400 }
      );
    }

    if (isUsingLocalDb()) {
      const { query } = await import('@/lib/db');

      const postOwnerResult = await query('SELECT user_id FROM posts WHERE id = $1 LIMIT 1', [post_id]);
      const postOwnerId = postOwnerResult.rows[0]?.user_id || null;

      const insertResult = await query(
        `INSERT INTO comments (post_id, user_id, content, parent_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, post_id, user_id, content, created_at`,
        [post_id, user_id, content.trim(), parent_id || null]
      );

      const comment = insertResult.rows[0];

      const userResult = await query(
        `SELECT id, username, display_name, avatar_url
         FROM users
         WHERE id = $1`,
        [user_id]
      );

      if (postOwnerId && postOwnerId !== user_id) {
        try {
          await createNotification({
            userId: postOwnerId,
            type: 'comment',
            actorId: user_id,
            referenceType: 'post',
            referenceId: post_id,
            title: 'New comment',
            message: `commented: "${content.trim().slice(0, 120)}"`,
          });

          deleteCacheByPrefix(CACHE_KEYS.USER_NOTIFICATIONS(postOwnerId));
          deleteCache(CACHE_KEYS.USER_NOTIFICATIONS_UNREAD(postOwnerId));
        } catch (notificationError) {
          console.error('Error creating comment notification (local DB):', notificationError);
        }
      }

      deleteCache(`post:${post_id}`);

      return NextResponse.json(
        {
          comment: {
            ...comment,
            user: userResult.rows[0] || null,
          },
        },
        { status: 201 }
      );
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', post_id)
      .single();

    if (postError) {
      console.error('Error loading post owner:', postError);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postOwnerId = postData?.user_id || null;

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id,
        user_id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select(
        `
        id,
        post_id,
        user_id,
        content,
        created_at,
        user:users!comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    if (postOwnerId && postOwnerId !== user_id) {
      try {
        await createNotification({
          userId: postOwnerId,
          type: 'comment',
          actorId: user_id,
          referenceType: 'post',
          referenceId: post_id,
          title: 'New comment',
          message: `commented: "${content.trim().slice(0, 120)}"`,
        });

        deleteCacheByPrefix(CACHE_KEYS.USER_NOTIFICATIONS(postOwnerId));
        deleteCache(CACHE_KEYS.USER_NOTIFICATIONS_UNREAD(postOwnerId));
      } catch (notificationError) {
        console.error('Error creating comment notification (supabase):', notificationError);
      }
    }

    deleteCache(`post:${post_id}`);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/comments?comment_id=xxx - Update own comment (edit)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('comment_id');
    const { user_id, content } = body;

    if (!commentId || !user_id || !content?.trim()) {
      return NextResponse.json(
        { error: 'comment_id, user_id, and content are required' },
        { status: 400 }
      );
    }

    if (isUsingLocalDb()) {
      const { query } = await import('@/lib/db');

      // Verify comment exists and user is owner
      const checkResult = await query(
        'SELECT id, user_id, post_id FROM comments WHERE id = $1',
        [commentId]
      );

      if (!checkResult.rows.length) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      const comment = checkResult.rows[0];
      if (comment.user_id !== user_id) {
        return NextResponse.json(
          { error: 'Unauthorized - can only edit own comments' },
          { status: 403 }
        );
      }

      // Update the comment
      const updateResult = await query(
        `UPDATE comments SET content = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, post_id, user_id, content, created_at, updated_at`,
        [content.trim(), commentId]
      );

      const updatedComment = updateResult.rows[0];

      // Fetch user data
      const userResult = await query(
        'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
        [user_id]
      );

      deleteCache(`post:${comment.post_id}`);

      return NextResponse.json(
        {
          comment: {
            ...updatedComment,
            user: userResult.rows[0] || null,
          },
        },
        { status: 200 }
      );
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Verify comment exists and user is owner
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, user_id, post_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.user_id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized - can only edit own comments' },
        { status: 403 }
      );
    }

    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update({ content: content.trim(), updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select(
        `
        id,
        post_id,
        user_id,
        content,
        created_at,
        updated_at,
        user:users!comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }

    deleteCache(`post:${comment.post_id}`);

    return NextResponse.json(
      { comment: updatedComment },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/comments?comment_id=xxx - Delete own comment
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('comment_id');
    const userId = searchParams.get('user_id');

    if (!commentId || !userId) {
      return NextResponse.json(
        { error: 'comment_id and user_id are required' },
        { status: 400 }
      );
    }

    if (isUsingLocalDb()) {
      const { query } = await import('@/lib/db');

      // Verify comment exists and user is owner
      const checkResult = await query(
        'SELECT id, user_id, post_id FROM comments WHERE id = $1',
        [commentId]
      );

      if (!checkResult.rows.length) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      const comment = checkResult.rows[0];
      if (comment.user_id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized - can only delete own comments' },
          { status: 403 }
        );
      }

      // Delete the comment
      await query('DELETE FROM comments WHERE id = $1', [commentId]);

      deleteCache(`post:${comment.post_id}`);

      return NextResponse.json({ success: true }, { status: 200 });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Verify comment exists and user is owner
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, user_id, post_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - can only delete own comments' },
        { status: 403 }
      );
    }

    // Delete the comment
    const { error } = await supabase.from('comments').delete().eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    deleteCache(`post:${comment.post_id}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
