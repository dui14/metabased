import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { deleteCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/comments/likes?comment_id=xxx - Check like status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('comment_id');
    const userId = searchParams.get('user_id');

    if (!commentId) {
      return NextResponse.json({ error: 'comment_id is required' }, { status: 400 });
    }

    if (isUsingLocalDb()) {
      const { query } = await import('@/lib/db');

      // Get comment likes count
      const countResult = await query(
        'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = $1',
        [commentId]
      );
      const likesCount = parseInt(countResult.rows[0]?.count || '0');

      // Check if current user liked
      let isLiked = false;
      if (userId) {
        const likeCheckResult = await query(
          'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userId]
        );
        isLiked = likeCheckResult.rows.length > 0;
      }

      return NextResponse.json({
        comment_id: commentId,
        likes_count: likesCount,
        isLiked,
      });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get comment likes count
    const { count, error: countError } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    if (countError) {
      console.error('Error counting likes:', countError);
      return NextResponse.json({ error: 'Failed to count likes' }, { status: 500 });
    }

    // Check if current user liked
    let isLiked = false;
    if (userId) {
      const { data: likeData } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();
      isLiked = !!likeData;
    }

    return NextResponse.json({
      comment_id: commentId,
      likes_count: count || 0,
      isLiked,
    });
  } catch (error) {
    console.error('Error in GET /api/comments/likes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/comments/likes - Like/Unlike comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { comment_id, user_id, action } = body;

    if (!comment_id || !user_id || !action) {
      return NextResponse.json(
        { error: 'comment_id, user_id, and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'like' && action !== 'unlike') {
      return NextResponse.json(
        { error: 'action must be "like" or "unlike"' },
        { status: 400 }
      );
    }

    if (isUsingLocalDb()) {
      const { query } = await import('@/lib/db');

      // Verify comment exists
      const commentCheckResult = await query(
        'SELECT id, user_id, post_id FROM comment_likes_by_comment($1) LIMIT 1',
        [comment_id]
      ).catch(() => query('SELECT id FROM comments WHERE id = $1', [comment_id]));

      if (!commentCheckResult.rows.length) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      if (action === 'like') {
        // Check if already liked
        const existingLikeResult = await query(
          'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
          [comment_id, user_id]
        );

        if (existingLikeResult.rows.length) {
          return NextResponse.json(
            { error: 'Already liked this comment' },
            { status: 400 }
          );
        }

        // Insert like
        await query(
          'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
          [comment_id, user_id]
        );

        // Update comments.likes_count
        await query(
          'UPDATE comments SET likes_count = likes_count + 1 WHERE id = $1',
          [comment_id]
        );

        // Get comment owner to notify
        const commentResult = await query(
          'SELECT user_id, post_id FROM comments WHERE id = $1',
          [comment_id]
        );

        const commentOwnerId = commentResult.rows[0]?.user_id;

        // Create notification (optional - product decision)
        if (commentOwnerId && commentOwnerId !== user_id) {
          try {
            await createNotification({
              userId: commentOwnerId,
              type: 'system', // or could be 'comment_like' type
              actorId: user_id,
              referenceType: 'comment',
              referenceId: comment_id,
              title: 'Liked your comment',
              message: 'liked your comment',
            });
            deleteCache(`comment:${comment_id}:likes`);
          } catch (notificationError) {
            console.error('Error creating like notification:', notificationError);
          }
        }
      } else {
        // Unlike - delete like
        const deleteResult = await query(
          'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
          [comment_id, user_id]
        );

        if (!deleteResult.rowCount) {
          return NextResponse.json({ error: 'You did not like this comment' }, { status: 400 });
        }

        // Update comments.likes_count
        await query(
          'UPDATE comments SET likes_count = likes_count - 1 WHERE id = $1',
          [comment_id]
        );
      }

      // Get updated count
      const countResult = await query(
        'SELECT likes_count FROM comments WHERE id = $1',
        [comment_id]
      );

      return NextResponse.json(
        {
          success: true,
          action,
          likes_count: countResult.rows[0]?.likes_count || 0,
        },
        { status: 200 }
      );
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Verify comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, user_id, post_id, likes_count')
      .eq('id', comment_id)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (action === 'like') {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', comment_id)
        .eq('user_id', user_id)
        .single();

      if (existingLike) {
        return NextResponse.json({ error: 'Already liked this comment' }, { status: 400 });
      }

      // Insert like
      const { error: insertError } = await supabase.from('comment_likes').insert({
        comment_id,
        user_id,
      });

      if (insertError) {
        console.error('Error liking comment:', insertError);
        return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
      }

      // Update comments.likes_count
      const { error: updateError } = await supabase
        .from('comments')
        .update({ likes_count: (comment.likes_count || 0) + 1 })
        .eq('id', comment_id);

      if (updateError) {
        console.error('Error updating likes count:', updateError);
      }

      // Create notification (optional)
      if (comment.user_id && comment.user_id !== user_id) {
        try {
          await createNotification({
            userId: comment.user_id,
            type: 'system',
            actorId: user_id,
            referenceType: 'comment',
            referenceId: comment_id,
            title: 'Liked your comment',
            message: 'liked your comment',
          });
          deleteCache(`comment:${comment_id}:likes`);
        } catch (notificationError) {
          console.error('Error creating like notification:', notificationError);
        }
      }
    } else {
      // Unlike
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', comment_id)
        .eq('user_id', user_id);

      if (deleteError) {
        console.error('Error unliking comment:', deleteError);
        return NextResponse.json({ error: 'Failed to unlike comment' }, { status: 500 });
      }

      // Update comments.likes_count
      const { error: updateError } = await supabase
        .from('comments')
        .update({ likes_count: Math.max(0, (comment.likes_count || 1) - 1) })
        .eq('id', comment_id);

      if (updateError) {
        console.error('Error updating likes count:', updateError);
      }
    }

    // Get updated count
    const { data: updatedComment } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', comment_id)
      .single();

    return NextResponse.json(
      {
        success: true,
        action,
        likes_count: updatedComment?.likes_count || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/comments/likes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
