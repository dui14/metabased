import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { CACHE_KEYS, deleteCache, deleteCacheByPrefix } from '@/lib/cache';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('post_id');
    const parentId = searchParams.get('parent_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const useLocalDb = isUsingLocalDb();

    if (useLocalDb) {
      const { query } = await import('@/lib/db');
      const parentFilter = parentId
        ? 'c.parent_id = $2'
        : 'c.parent_id IS NULL';

      const values = parentId
        ? [postId, parentId, limit, offset]
        : [postId, limit, offset];

      const queryText = parentId
        ? `SELECT
            c.*,
            json_build_object(
              'id', u.id,
              'username', u.username,
              'display_name', u.display_name,
              'avatar_url', u.avatar_url,
              'wallet_address', u.wallet_address
            ) as user
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.post_id = $1 AND ${parentFilter}
          ORDER BY c.created_at DESC
          LIMIT $3 OFFSET $4`
        : `SELECT
            c.*,
            json_build_object(
              'id', u.id,
              'username', u.username,
              'display_name', u.display_name,
              'avatar_url', u.avatar_url,
              'wallet_address', u.wallet_address
            ) as user
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.post_id = $1 AND ${parentFilter}
          ORDER BY c.created_at DESC
          LIMIT $2 OFFSET $3`;

      const result = await query(queryText, values);
      return NextResponse.json({ comments: result.rows || [] });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    let supabaseQuery = supabase
      .from('comments')
      .select(`
        *,
        user:users!comments_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          wallet_address
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (parentId) {
      supabaseQuery = supabaseQuery.eq('parent_id', parentId);
    } else {
      supabaseQuery = supabaseQuery.is('parent_id', null);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ comments: data || [] });
  } catch (error) {
    console.error('Error in GET /api/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const postId = body?.post_id;
    const parentId = body?.parent_id || null;
    const content = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const useLocalDb = isUsingLocalDb();

    if (useLocalDb) {
      const { query } = await import('@/lib/db');

      const postResult = await query('SELECT id, user_id FROM posts WHERE id = $1 LIMIT 1', [postId]);
      if (postResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      const postOwnerId = postResult.rows[0].user_id as string;

      const insertResult = await query(
        `INSERT INTO comments (post_id, user_id, content, parent_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [postId, currentUser.id, content, parentId]
      );

      const comment = insertResult.rows[0];
      const userResult = await query(
        `SELECT id, username, display_name, avatar_url, wallet_address
         FROM users WHERE id = $1 LIMIT 1`,
        [currentUser.id]
      );

      deleteCache(`post:${postId}`);
      deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
      deleteCacheByPrefix(`posts:user:${currentUser.id}`);

      try {
        await createNotification({
          userId: postOwnerId,
          actorId: currentUser.id,
          type: 'comment',
          title: 'New comment',
          message: 'commented on your post',
          referenceType: 'post',
          referenceId: postId,
        });
      } catch (notificationError) {
        console.error('Error creating comment notification:', notificationError);
      }

      return NextResponse.json(
        {
          comment: {
            ...comment,
            user: userResult.rows[0] || null,
          },
          success: true,
        },
        { status: 201 }
      );
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: currentUser.id,
        content,
        parent_id: parentId,
      })
      .select(`
        *,
        user:users!comments_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          wallet_address
        )
      `)
      .single();

    if (error || !comment) {
      console.error('Error creating comment:', error);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    deleteCache(`post:${postId}`);
    deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
    deleteCacheByPrefix(`posts:user:${currentUser.id}`);

    try {
      await createNotification({
        userId: post.user_id,
        actorId: currentUser.id,
        type: 'comment',
        title: 'New comment',
        message: 'commented on your post',
        referenceType: 'post',
        referenceId: postId,
      });
    } catch (notificationError) {
      console.error('Error creating comment notification:', notificationError);
    }

    return NextResponse.json(
      { comment, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
