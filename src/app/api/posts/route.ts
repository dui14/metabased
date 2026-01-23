import { NextRequest, NextResponse } from 'next/server';
import { postService } from '@/lib/supabase';
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
    const noCache = searchParams.get('noCache') === 'true';
    
    // Cache key dựa trên params
    const cacheKey = userId 
      ? `posts:user:${userId}:${limit}:${offset}`
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
          // Fetch posts của một user cụ thể
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
    const body = await request.json();
    
    const { user_id, image_url, caption, visibility = 'public', is_nft = false, nft_price = null } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Require at least caption or image
    if (!image_url && !caption) {
      return NextResponse.json(
        { error: 'Either caption or image is required' },
        { status: 400 }
      );
    }

    // Tạo post sử dụng postService
    const post = await postService.create({
      user_id,
      image_url: image_url || null,
      caption: caption || null,
      visibility,
      is_nft,
      nft_price: is_nft ? nft_price : null,
    });

    // Invalidate cache sau khi tạo post mới
    deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
    deleteCacheByPrefix(`posts:user:${user_id}`);

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
