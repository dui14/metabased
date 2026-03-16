import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const useLocalDb = isUsingLocalDb();
    
    if (useLocalDb) {
      const { query, getClient } = await import('@/lib/db');
      
      if (action === 'unlike') {
        const client = await getClient();
        try {
          await client.query('BEGIN');
          
          const deleteResult = await client.query(
            'DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING id',
            [user_id, post_id]
          );
          
          if (deleteResult.rowCount && deleteResult.rowCount > 0) {
            const countResult = await client.query(
              'SELECT COUNT(*)::int as count FROM likes WHERE post_id = $1',
              [post_id]
            );
            
            await client.query(
              'UPDATE posts SET likes_count = $1 WHERE id = $2',
              [countResult.rows[0].count, post_id]
            );
          }
          
          await client.query('COMMIT');
          return NextResponse.json({ success: true, action: 'unliked' });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } else {
        const client = await getClient();
        try {
          await client.query('BEGIN');

          const postOwnerResult = await client.query(
            'SELECT user_id FROM posts WHERE id = $1 LIMIT 1',
            [post_id]
          );

          if (postOwnerResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
          }

          const postOwnerId = postOwnerResult.rows[0].user_id as string;
          
          const existingLike = await client.query(
            'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
            [user_id, post_id]
          );
          
          if (existingLike.rows.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { success: true, action: 'already_liked' },
              { status: 200 }
            );
          }
          
          await client.query(
            'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
            [user_id, post_id]
          );
          
          const countResult = await client.query(
            'SELECT COUNT(*)::int as count FROM likes WHERE post_id = $1',
            [post_id]
          );
          
          await client.query(
            'UPDATE posts SET likes_count = $1 WHERE id = $2',
            [countResult.rows[0].count, post_id]
          );
          
          await client.query('COMMIT');

          try {
            await createNotification({
              userId: postOwnerId,
              actorId: user_id,
              type: 'like',
              title: 'New like',
              message: 'liked your post',
              referenceType: 'post',
              referenceId: post_id,
            });
          } catch (notificationError) {
            console.error('Error creating like notification:', notificationError);
          }

          return NextResponse.json({ success: true, action: 'liked' });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: postOwner } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', post_id)
      .single();

    if (!postOwner) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (action === 'unlike') {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user_id)
        .eq('post_id', post_id);

      if (error) {
        console.error('Error unliking:', error);
        return NextResponse.json(
          { error: 'Failed to unlike' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, action: 'unliked' });
    } else {
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user_id)
        .eq('post_id', post_id)
        .single();

      if (existingLike) {
        return NextResponse.json(
          { success: true, action: 'already_liked' },
          { status: 200 }
        );
      }

      const { error } = await supabase
        .from('likes')
        .insert({
          user_id,
          post_id,
        });

      if (error) {
        console.error('Error liking:', error);
        return NextResponse.json(
          { error: 'Failed to like' },
          { status: 500 }
        );
      }

      try {
        await createNotification({
          userId: postOwner.user_id,
          actorId: user_id,
          type: 'like',
          title: 'New like',
          message: 'liked your post',
          referenceType: 'post',
          referenceId: post_id,
        });
      } catch (notificationError) {
        console.error('Error creating like notification:', notificationError);
      }

      return NextResponse.json({ success: true, action: 'liked' });
    }
  } catch (error) {
    console.error('Error in POST /api/likes:', error);
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
        'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
        [user_id, post_id]
      );
      
      return NextResponse.json({ isLiked: result.rows.length > 0 });
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: like, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user_id)
      .eq('post_id', post_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking like status:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ isLiked: !!like });
  } catch (error) {
    console.error('Error in GET /api/likes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
