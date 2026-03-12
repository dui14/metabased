import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { CACHE_KEYS, deleteCache, deleteCacheByPrefix } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { follower_id, following_id, action } = body;

    if (!follower_id || !following_id) {
      return NextResponse.json(
        { error: 'Follower ID and Following ID are required' },
        { status: 400 }
      );
    }

    if (follower_id === following_id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    const useLocalDb = isUsingLocalDb();
    
    if (useLocalDb) {
      const { query } = await import('@/lib/db');
      
      if (action === 'unfollow') {
        await query(
          'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
          [follower_id, following_id]
        );
        return NextResponse.json({ success: true, action: 'unfollowed' });
      } else {
        const existingFollow = await query(
          'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
          [follower_id, following_id]
        );
        
        if (existingFollow.rows.length > 0) {
          return NextResponse.json(
            { error: 'Already following this user' },
            { status: 409 }
          );
        }
        
        await query(
          'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
          [follower_id, following_id]
        );

        try {
          await createNotification({
            userId: following_id,
            type: 'follow',
            actorId: follower_id,
            referenceType: 'user',
            referenceId: follower_id,
            title: 'New follower',
            message: 'started following you',
          });

          deleteCacheByPrefix(CACHE_KEYS.USER_NOTIFICATIONS(following_id));
          deleteCache(CACHE_KEYS.USER_NOTIFICATIONS_UNREAD(following_id));
        } catch (notificationError) {
          console.error('Error creating follow notification (local DB):', notificationError);
        }

        return NextResponse.json({ success: true, action: 'followed' });
      }
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    if (action === 'unfollow') {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', follower_id)
        .eq('following_id', following_id);

      if (error) {
        console.error('Error unfollowing:', error);
        return NextResponse.json(
          { error: 'Failed to unfollow' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, action: 'unfollowed' });
    } else {
      // Follow
      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', follower_id)
        .eq('following_id', following_id)
        .single();

      if (existingFollow) {
        return NextResponse.json(
          { error: 'Already following this user' },
          { status: 409 }
        );
      }

      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id,
          following_id,
        });

      if (error) {
        console.error('Error following:', error);
        return NextResponse.json(
          { error: 'Failed to follow' },
          { status: 500 }
        );
      }

      try {
        await createNotification({
          userId: following_id,
          type: 'follow',
          actorId: follower_id,
          referenceType: 'user',
          referenceId: follower_id,
          title: 'New follower',
          message: 'started following you',
        });

        deleteCacheByPrefix(CACHE_KEYS.USER_NOTIFICATIONS(following_id));
        deleteCache(CACHE_KEYS.USER_NOTIFICATIONS_UNREAD(following_id));
      } catch (notificationError) {
        console.error('Error creating follow notification (supabase):', notificationError);
      }

      return NextResponse.json({ success: true, action: 'followed' });
    }
  } catch (error) {
    console.error('Error in POST /api/follows:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/follows?follower_id=xxx&following_id=yyy - Check if user is following
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const follower_id = searchParams.get('follower_id');
    const following_id = searchParams.get('following_id');

    if (!follower_id || !following_id) {
      return NextResponse.json(
        { error: 'Follower ID and Following ID are required' },
        { status: 400 }
      );
    }

    const useLocalDb = isUsingLocalDb();
    
    if (useLocalDb) {
      const { query } = await import('@/lib/db');
      
      const result = await query(
        'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
        [follower_id, following_id]
      );
      
      return NextResponse.json({ isFollowing: result.rows.length > 0 });
    }

    const supabase = createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: follow, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', follower_id)
      .eq('following_id', following_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking follow status:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Error in GET /api/follows:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
