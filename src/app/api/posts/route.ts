import { NextRequest, NextResponse } from 'next/server';
import { postService } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { 
  cacheOrFetch, 
  deleteCache, 
  deleteCacheByPrefix,
  CACHE_KEYS, 
  CACHE_TTL 
} from '@/lib/cache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/posts
// Lấy danh sách posts với caching
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('user_id');
    const includeReposts = searchParams.get('include_reposts') === 'true';
    const noCache = searchParams.get('noCache') === 'true';
    
    // Cache key dựa trên params
    const cacheKey = userId 
      ? `posts:user:${userId}:${includeReposts ? 'with-reposts' : 'posts-only'}:${limit}:${offset}`
      : `${CACHE_KEYS.POSTS_FEED}:${limit}:${offset}`;
    
    // Nếu yêu cầu fresh data, xóa cache
    if (noCache) {
      deleteCache(cacheKey);
    }
    
    // Sử dụng cache với TTL 30 giây cho feed (data thay đổi thường xuyên)
    const posts = await cacheOrFetch(
      cacheKey,
      async () => {
        if (userId) {
          if (includeReposts) {
            return await postService.getByUserIdWithReposts(userId, limit, offset);
          }
          return await postService.getByUserId(userId, limit, offset);
        } else {
          // Fetch feed chung
          return await postService.getFeed(limit, offset);
        }
      },
      { ttl: CACHE_TTL.SHORT }
    );

    // Set cache headers for browser/CDN caching
    return NextResponse.json(
      { posts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/posts
// Tạo post mới (hỗ trợ text-only posts)
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
    const { image_url, caption, visibility = 'public' } = body;

    // Require at least caption or image
    if (!image_url && !caption) {
      return NextResponse.json(
        { error: 'Either caption or image is required' },
        { status: 400 }
      );
    }

    if (!['public', 'private', 'followers'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility value' },
        { status: 400 }
      );
    }

    const useLocalDb = isUsingLocalDb();
    let post: any;

    if (useLocalDb) {
      const { query } = await import('@/lib/db');
      const insertResult = await query(
        `INSERT INTO posts (
          user_id, image_url, caption, visibility, is_nft, nft_price,
          likes_count, comments_count, reposts_count
        ) VALUES ($1, $2, $3, $4, false, null, 0, 0, 0)
        RETURNING *`,
        [currentUser.id, image_url || null, caption || null, visibility]
      );

      if (insertResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Failed to create post' },
          { status: 500 }
        );
      }

      const createdPost = insertResult.rows[0];
      const userResult = await query(
        `SELECT id, username, display_name, avatar_url, wallet_address
         FROM users WHERE id = $1`,
        [currentUser.id]
      );

      post = {
        ...createdPost,
        user: userResult.rows[0] || null,
      };
    } else {
      const supabase = createServerSupabaseClient();

      if (!supabase) {
        return NextResponse.json(
          { error: 'Database not configured' },
          { status: 500 }
        );
      }

      const { data: insertedPost, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          image_url: image_url || null,
          caption: caption || null,
          visibility,
          is_nft: false,
          nft_price: null,
          likes_count: 0,
          comments_count: 0,
          reposts_count: 0,
        })
        .select('*')
        .single();

      if (insertError || !insertedPost) {
        console.error('Error creating post:', insertError);
        return NextResponse.json(
          { error: 'Failed to create post' },
          { status: 500 }
        );
      }

      const { data: postUser, error: userError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, wallet_address')
        .eq('id', currentUser.id)
        .single();

      if (userError) {
        console.error('Error fetching user after post creation:', userError);
      }

      post = {
        ...insertedPost,
        user: postUser || null,
      };
    }

    // Invalidate cache sau khi tạo post mới
    deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
    deleteCacheByPrefix(`posts:user:${currentUser.id}`);

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
