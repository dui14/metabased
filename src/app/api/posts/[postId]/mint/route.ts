import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isUsingLocalDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { deleteCache, deleteCacheByPrefix, CACHE_KEYS } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      contract_type,
      contract_address,
      token_id,
      tx_hash = null,
      nft_price = null,
    } = body;

    if (!contract_type || !['ERC721', 'ERC1155'].includes(contract_type)) {
      return NextResponse.json(
        { error: 'Invalid contract_type. Must be ERC721 or ERC1155' },
        { status: 400 }
      );
    }

    if (!contract_address || typeof contract_address !== 'string') {
      return NextResponse.json(
        { error: 'contract_address is required' },
        { status: 400 }
      );
    }

    if (!token_id || typeof token_id !== 'string') {
      return NextResponse.json(
        { error: 'token_id is required' },
        { status: 400 }
      );
    }

    const useLocalDb = isUsingLocalDb();

    if (useLocalDb) {
      const { query } = await import('@/lib/db');

      const ownershipResult = await query(
        'SELECT user_id FROM posts WHERE id = $1 LIMIT 1',
        [params.postId]
      );

      if (ownershipResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      const ownerId = ownershipResult.rows[0].user_id as string;
      if (ownerId !== currentUser.id && currentUser.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - You can only mint your own posts' },
          { status: 403 }
        );
      }

      const updateResult = await query(
        `UPDATE posts
         SET is_nft = true,
             nft_token_id = $1,
             nft_contract_address = $2,
             nft_price = $3,
             nft_status = 'minted',
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [token_id, contract_address, nft_price, params.postId]
      );

      if (updateResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Failed to update post NFT data' },
          { status: 500 }
        );
      }

      const postData = updateResult.rows[0];
      const userResult = await query(
        `SELECT id, username, display_name, avatar_url, wallet_address
         FROM users WHERE id = $1`,
        [postData.user_id]
      );

      const post = {
        ...postData,
        user: userResult.rows[0] || null,
      };

      deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
      deleteCacheByPrefix(`posts:user:${post.user_id}`);
      deleteCache(`post:${params.postId}`);

      return NextResponse.json({ post, tx_hash, contract_type });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: existingPost, error: existingPostError } = await supabase
      .from('posts')
      .select('id, user_id, is_nft')
      .eq('id', params.postId)
      .single();

    if (existingPostError || !existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== currentUser.id && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - You can only mint your own posts' },
        { status: 403 }
      );
    }

    if (existingPost.is_nft) {
      return NextResponse.json(
        { error: 'Post is already minted as NFT' },
        { status: 409 }
      );
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({
        is_nft: true,
        nft_token_id: token_id,
        nft_contract_address: contract_address,
        nft_price,
        nft_status: 'minted',
      })
      .eq('id', params.postId)
      .select(
        `
          *,
          user:users!posts_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            wallet_address
          )
        `
      )
      .single();

    if (updateError || !updatedPost) {
      console.error('Error updating post mint data:', updateError);
      return NextResponse.json(
        { error: 'Failed to update post NFT data' },
        { status: 500 }
      );
    }

    deleteCacheByPrefix(CACHE_KEYS.POSTS_FEED);
    deleteCacheByPrefix(`posts:user:${updatedPost.user_id}`);
    deleteCache(`post:${params.postId}`);

    return NextResponse.json({
      post: updatedPost,
      tx_hash,
      contract_type,
    });
  } catch (error) {
    console.error('Error in POST /api/posts/[postId]/mint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
