import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/follows - Follow/Unfollow user
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
