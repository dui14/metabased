import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { 
  deleteCache, 
  deleteCacheByPrefix,
  CACHE_KEYS 
} from '@/lib/cache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/posts/[postId]
// Lấy chi tiết post theo ID
export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          wallet_address
        )
      `)
      .eq('id', params.postId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching post:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error in GET /api/posts/[postId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/posts/[postId]
// Cập nhật post (visibility, caption, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { visibility, caption } = body;
    
    const updateData: any = {};
    if (visibility !== undefined) updateData.visibility = visibility;
    if (caption !== undefined) updateData.caption = caption;
    
    const { data: post, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', params.postId)
      .select(`
        *,
        user:users!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          wallet_address
        )
      `)
      .single();

    if (error) {
      console.error('Error updating post:', error);
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      );
    }

    // Invalidate cache sau khi update
    deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
    deleteCacheByPrefix(`posts:user:${post.user_id}`);
    deleteCache(`post:${params.postId}`);

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error in PUT /api/posts/[postId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[postId]
// Xóa post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    // Get post first để lấy user_id cho cache invalidation
    const { data: postToDelete } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', params.postId)
      .single();
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', params.postId);

    if (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json(
        { error: 'Failed to delete post' },
        { status: 500 }
      );
    }

    // Invalidate cache sau khi delete
    deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
    if (postToDelete?.user_id) {
      deleteCacheByPrefix(`posts:user:${postToDelete.user_id}`);
    }
    deleteCache(`post:${params.postId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/posts/[postId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
