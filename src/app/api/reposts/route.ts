import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { deleteCache, deleteCacheByPrefix, CACHE_KEYS } from '@/lib/cache';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function invalidatePostCaches(postId: string, postOwnerId?: string | null, actorUserId?: string | null) {
  deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
  if (postOwnerId) {
    deleteCacheByPrefix(`posts:user:${postOwnerId}`);
  }
  if (actorUserId && actorUserId !== postOwnerId) {
    deleteCacheByPrefix(`posts:user:${actorUserId}`);
  }
  deleteCache(`post:${postId}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, post_id, action } = body;

    if (!user_id || !post_id) {
      return NextResponse.json(
        { error: 'User ID and Post ID are required' },
        { status: 400 }
      );
    }

    const normalizedAction = action === 'unrepost' ? 'unrepost' : 'repost';
    const useLocalDb = isUsingLocalDb();

    if (useLocalDb) {
      const { getClient } = await import('@/lib/db');
      const client = await getClient();

      try {
        await client.query('BEGIN');

        const postResult = await client.query(
          'SELECT id, user_id FROM posts WHERE id = $1 LIMIT 1',
          [post_id]
        );

        if (postResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const postOwnerId = postResult.rows[0].user_id as string;

        if (postOwnerId === user_id && normalizedAction === 'repost') {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'You cannot repost your own post' },
            { status: 400 }
          );
        }

        if (normalizedAction === 'unrepost') {
          await client.query(
            'DELETE FROM reposts WHERE user_id = $1 AND post_id = $2',
            [user_id, post_id]
          );

          const countResult = await client.query(
            'SELECT COUNT(*)::int AS count FROM reposts WHERE post_id = $1',
            [post_id]
          );

          await client.query(
            'UPDATE posts SET reposts_count = $1 WHERE id = $2',
            [countResult.rows[0].count, post_id]
          );

          await client.query('COMMIT');
          invalidatePostCaches(post_id, postOwnerId, user_id);
          return NextResponse.json({ success: true, action: 'unreposted' });
        }

        const existingResult = await client.query(
          'SELECT id FROM reposts WHERE user_id = $1 AND post_id = $2 LIMIT 1',
          [user_id, post_id]
        );

        if (existingResult.rows.length > 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ success: true, action: 'already_reposted' });
        }

        await client.query(
          'INSERT INTO reposts (user_id, post_id) VALUES ($1, $2)',
          [user_id, post_id]
        );

        const countResult = await client.query(
          'SELECT COUNT(*)::int AS count FROM reposts WHERE post_id = $1',
          [post_id]
        );

        await client.query(
          'UPDATE posts SET reposts_count = $1 WHERE id = $2',
          [countResult.rows[0].count, post_id]
        );

        await client.query('COMMIT');

        try {
          await createNotification({
            userId: postOwnerId,
            actorId: user_id,
            type: 'repost',
            title: 'New repost',
            message: 'reposted your post',
            referenceType: 'post',
            referenceId: post_id,
          });
        } catch (notificationError) {
          console.error('Error creating repost notification:', notificationError);
        }

        invalidatePostCaches(post_id, postOwnerId, user_id);
        return NextResponse.json({ success: true, action: 'reposted' });
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

    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', post_id)
      .single();

    if (postError || !postData) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (postData.user_id === user_id && normalizedAction === 'repost') {
      return NextResponse.json(
        { error: 'You cannot repost your own post' },
        { status: 400 }
      );
    }

    if (normalizedAction === 'unrepost') {
      const { error: deleteError } = await supabase
        .from('reposts')
        .delete()
        .eq('user_id', user_id)
        .eq('post_id', post_id);

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to remove repost' }, { status: 500 });
      }

      const { count } = await supabase
        .from('reposts')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post_id);

      const { error: updateError } = await supabase
        .from('posts')
        .update({ reposts_count: count || 0 })
        .eq('id', post_id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update repost count' }, { status: 500 });
      }

      invalidatePostCaches(post_id, postData.user_id, user_id);
      return NextResponse.json({ success: true, action: 'unreposted' });
    }

    const { data: existingRepost } = await supabase
      .from('reposts')
      .select('id')
      .eq('user_id', user_id)
      .eq('post_id', post_id)
      .single();

    if (existingRepost) {
      return NextResponse.json({ success: true, action: 'already_reposted' });
    }

    const { error: insertError } = await supabase
      .from('reposts')
      .insert({
        user_id,
        post_id,
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to repost' }, { status: 500 });
    }

    const { count } = await supabase
      .from('reposts')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post_id);

    const { error: updateError } = await supabase
      .from('posts')
      .update({ reposts_count: count || 0 })
      .eq('id', post_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update repost count' }, { status: 500 });
    }

    try {
      await createNotification({
        userId: postData.user_id,
        actorId: user_id,
        type: 'repost',
        title: 'New repost',
        message: 'reposted your post',
        referenceType: 'post',
        referenceId: post_id,
      });
    } catch (notificationError) {
      console.error('Error creating repost notification:', notificationError);
    }

    invalidatePostCaches(post_id, postData.user_id, user_id);
    return NextResponse.json({ success: true, action: 'reposted' });
  } catch (error) {
    console.error('Error in POST /api/reposts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get('user_id');
    const post_id = searchParams.get('post_id');

    if (!user_id || !post_id) {
      return NextResponse.json(
        { error: 'User ID and Post ID are required' },
        { status: 400 }
      );
    }

    const useLocalDb = isUsingLocalDb();

    if (useLocalDb) {
      const { query } = await import('@/lib/db');
      const result = await query(
        'SELECT id FROM reposts WHERE user_id = $1 AND post_id = $2 LIMIT 1',
        [user_id, post_id]
      );

      return NextResponse.json({ isReposted: result.rows.length > 0 });
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: repost, error } = await supabase
      .from('reposts')
      .select('id')
      .eq('user_id', user_id)
      .eq('post_id', post_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ isReposted: !!repost });
  } catch (error) {
    console.error('Error in GET /api/reposts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
