import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { 
  cacheOrFetch,
  deleteCache, 
  deleteCacheByPrefix,
  CACHE_KEYS,
  CACHE_TTL
} from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const useLocalDb = isUsingLocalDb();
    
    if (useLocalDb) {
      const { query } = await import('@/lib/db');
      
      const searchParams = request.nextUrl.searchParams;
      const noCache = searchParams.get('noCache') === 'true';
      const cacheKey = `post:${params.postId}`;
      
      if (noCache) {
        deleteCache(cacheKey);
      }
      
      const post = await cacheOrFetch(
        cacheKey,
        async () => {
          const result = await query(`
            SELECT 
              p.*,
              json_build_object(
                'id', u.id,
                'username', u.username,
                'display_name', u.display_name,
                'avatar_url', u.avatar_url,
                'wallet_address', u.wallet_address
              ) as user
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
          `, [params.postId]);
          
          if (result.rows.length === 0) {
            throw new Error('POST_NOT_FOUND');
          }
          
          return result.rows[0];
        },
        { ttl: CACHE_TTL.MEDIUM }
      );
      
      return NextResponse.json({ post }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }
    
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const noCache = searchParams.get('noCache') === 'true';
    const cacheKey = `post:${params.postId}`;
    
    if (noCache) {
      deleteCache(cacheKey);
    }
    
    const post = await cacheOrFetch(
      cacheKey,
      async () => {
        const { data, error } = await supabase
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
            throw new Error('POST_NOT_FOUND');
          }
          console.error('Error fetching post:', error);
          throw new Error('DATABASE_ERROR');
        }

        return data;
      },
      { ttl: CACHE_TTL.MEDIUM }
    );

    return NextResponse.json({ post }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/posts/[postId]:', error);
    
    if (error instanceof Error) {
      if (error.message === 'POST_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
    }
    
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
    const body = await request.json();
    const { visibility, caption } = body;
    
    const useLocalDb = isUsingLocalDb();
    
    if (useLocalDb) {
      const { query } = await import('@/lib/db');
      
      const fields = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (visibility !== undefined) {
        if (!['public', 'private', 'followers'].includes(visibility)) {
          return NextResponse.json(
            { error: 'Invalid visibility value' },
            { status: 400 }
          );
        }
        fields.push(`visibility = $${paramIndex++}`);
        values.push(visibility);
      }
      
      if (caption !== undefined) {
        fields.push(`caption = $${paramIndex++}`);
        values.push(caption);
      }
      
      if (fields.length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        );
      }
      
      fields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date().toISOString());
      values.push(params.postId);
      
      const result = await query(`
        UPDATE posts 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
      
      const postData = result.rows[0];
      
      const userResult = await query(`
        SELECT id, username, display_name, avatar_url, wallet_address
        FROM users WHERE id = $1
      `, [postData.user_id]);
      
      const post = {
        ...postData,
        user: userResult.rows[0]
      };
      
      deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
      deleteCacheByPrefix(`posts:user:${post.user_id}`);
      deleteCache(`post:${params.postId}`);
      
      return NextResponse.json({ post });
    }
    
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
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
// Xóa post (chỉ owner mới có thể xóa)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      token = request.cookies.get('dynamic_authentication_token')?.value;
    }
    
    console.log('DELETE post request for:', params.postId);
    console.log('Auth header present:', !!authHeader);
    console.log('Token present:', !!token);
    console.log('Token from cookie:', !authHeader && !!token);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const { verifyAndGetUser } = await import('@/lib/jwt');
    const userInfo = await verifyAndGetUser(token);
    
    console.log('User info from token:', userInfo ? 'valid' : 'invalid');
    
    if (!userInfo?.walletAddress) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const useLocalDb = isUsingLocalDb();
    
    if (useLocalDb) {
      const { query } = await import('@/lib/db');
      
      const userResult = await query(
        'SELECT id, role FROM users WHERE wallet_address = $1',
        [userInfo.walletAddress.toLowerCase()]
      );
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      const currentUser = userResult.rows[0];
      
      const postResult = await query(
        'SELECT user_id FROM posts WHERE id = $1',
        [params.postId]
      );
      
      if (postResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
      
      const postToDelete = postResult.rows[0];
      
      if (postToDelete.user_id !== currentUser.id && currentUser.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - You can only delete your own posts' },
          { status: 403 }
        );
      }
      
      await query('DELETE FROM posts WHERE id = $1', [params.postId]);
      
      deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
      if (postToDelete?.user_id) {
        deleteCacheByPrefix(`posts:user:${postToDelete.user_id}`);
      }
      deleteCache(`post:${params.postId}`);
      
      return NextResponse.json({ success: true });
    }
    
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('wallet_address', userInfo.walletAddress)
      .single();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const { data: postToDelete, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', params.postId)
      .single();

    if (fetchError || !postToDelete) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (postToDelete.user_id !== currentUser.id && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - You can only delete your own posts' },
        { status: 403 }
      );
    }
    
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
