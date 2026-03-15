import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type {
  DbUser,
  DbPost,
  DbComment,
  DbNft,
  DbNftListing,
  DbTransaction,
  DbNotification,
  DbMessage
} from './database.types';

// Kiểm tra có dùng local DB không
const useLocalDb = process.env.USE_LOCAL_DB === 'true';

// Dynamic import for db module (chỉ dùng server-side)
async function getDbQuery() {
  if (typeof window !== 'undefined') {
    throw new Error('db.query() chỉ có thể sử dụng ở server-side');
  }
  const { query } = await import('./db');
  return query;
}

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client for client-side (chỉ dùng khi USE_LOCAL_DB=false)
export const supabase = useLocalDb ? null : createClient(supabaseUrl, supabaseAnonKey);

// Create Supabase client with service role for server-side operations
export const createServerSupabaseClient = () => {
  if (useLocalDb) {
    return null;
  }
  
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Create Supabase client và throw error nếu không available
 * Dùng cho các API routes cần Supabase
 */
export const requireSupabaseClient = () => {
  const client = createServerSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not available when USE_LOCAL_DB=true');
  }
  return client;
};

// Re-export types for convenience
export type {
  DbUser,
  DbPost,
  DbComment,
  DbNft,
  DbNftListing,
  DbTransaction,
  DbNotification,
  DbMessage
} from './database.types';

// User service functions
export const userService = {
  // Get user by wallet address
  async getByWallet(walletAddress: string): Promise<DbUser | null> {
    if (useLocalDb) {
      try {
        const query = await getDbQuery();
        const result = await query<DbUser>(
          'SELECT * FROM users WHERE wallet_address = $1 LIMIT 1',
          [walletAddress.toLowerCase()]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    }
    
    // Supabase
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user:', error);
      return null;
    }
    return data;
  },

  // Create new user
  async create(walletAddress: string): Promise<DbUser | null> {
    if (useLocalDb) {
      try {
        const query = await getDbQuery();
        const result = await query<DbUser>(
          `INSERT INTO users (wallet_address, is_profile_complete) 
           VALUES ($1, false) 
           RETURNING *`,
          [walletAddress.toLowerCase()]
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error creating user:', error);
        return null;
      }
    }
    
    // Supabase
    const { data, error } = await supabase!
      .from('users')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        is_profile_complete: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
  },

  // Update user profile
  async updateProfile(
    walletAddress: string, 
    updates: { username?: string; display_name?: string; bio?: string; avatar_url?: string }
  ): Promise<DbUser | null> {
    if (useLocalDb) {
      try {
        const fields = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        if (updates.username !== undefined) {
          fields.push(`username = $${paramIndex++}`);
          values.push(updates.username);
        }
        if (updates.display_name !== undefined) {
          fields.push(`display_name = $${paramIndex++}`);
          values.push(updates.display_name);
        }
        if (updates.bio !== undefined) {
          fields.push(`bio = $${paramIndex++}`);
          values.push(updates.bio);
        }
        if (updates.avatar_url !== undefined) {
          fields.push(`avatar_url = $${paramIndex++}`);
          values.push(updates.avatar_url);
        }
        
        fields.push(`is_profile_complete = $${paramIndex++}`);
        values.push(true);
        
        fields.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
        
        values.push(walletAddress.toLowerCase());
        
        const query = await getDbQuery();
        const result = await query<DbUser>(
          `UPDATE users SET ${fields.join(', ')} WHERE wallet_address = $${paramIndex} RETURNING *`,
          values
        );
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error updating user:', error);
        return null;
      }
    }
    
    // Supabase
    const { data, error } = await supabase!
      .from('users')
      .update({
        ...updates,
        is_profile_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', walletAddress.toLowerCase())
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    return data;
  },

  // Check if username is available
  async isUsernameAvailable(username: string): Promise<boolean> {
    if (useLocalDb) {
      try {
        const query = await getDbQuery();
        const result = await query(
          'SELECT id FROM users WHERE username = $1 LIMIT 1',
          [username.toLowerCase()]
        );
        return result.rows.length === 0;
      } catch (error) {
        console.error('Error checking username:', error);
        return false;
      }
    }
    
    // Supabase
    const { data, error } = await supabase!
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();
    
    // If no data found, username is available
    return !data && error?.code === 'PGRST116';
  },

  // Get or create user
  async getOrCreate(walletAddress: string): Promise<DbUser | null> {
    let user = await this.getByWallet(walletAddress);
    if (!user) {
      user = await this.create(walletAddress);
    }
    return user;
  },
};

// Post service functions
export const postService = {
  // Get posts feed
  async getFeed(limit: number = 20, offset: number = 0): Promise<any[]> {
    if (useLocalDb) {
      try {
        const query = await getDbQuery();
        const result = await query(
          `SELECT 
            p.*,
            json_build_object(
              'id', u.id,
              'username', u.username,
              'display_name', u.display_name,
              'avatar_url', u.avatar_url,
              'wallet_address', u.wallet_address
            ) as user
           FROM posts p
           LEFT JOIN users u ON p.user_id = u.id
           WHERE p.visibility = 'public'
           ORDER BY p.created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        return result.rows || [];
      } catch (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
    }
    
    // Supabase
    const { data, error } = await supabase!
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
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
    
    return data || [];
  },

  // Get posts by user ID
  async getByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    if (useLocalDb) {
      try {
        const query = await getDbQuery();
        const result = await query(
          `SELECT 
            p.*,
            json_build_object(
              'id', u.id,
              'username', u.username,
              'display_name', u.display_name,
              'avatar_url', u.avatar_url,
              'wallet_address', u.wallet_address
            ) as user
           FROM posts p
           LEFT JOIN users u ON p.user_id = u.id
           WHERE p.user_id = $1
           ORDER BY p.created_at DESC
           LIMIT $2 OFFSET $3`,
          [userId, limit, offset]
        );
        return result.rows || [];
      } catch (error) {
        console.error('Error fetching user posts:', error);
        throw error;
      }
    }
    
    // Supabase
    const { data, error } = await supabase!
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }
    
    return data || [];
  },

  async getByUserIdWithReposts(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    if (useLocalDb) {
      try {
        const query = await getDbQuery();

        const ownPostsResult = await query(
          `SELECT
            p.*,
            json_build_object(
              'id', u.id,
              'username', u.username,
              'display_name', u.display_name,
              'avatar_url', u.avatar_url,
              'wallet_address', u.wallet_address
            ) as user,
            false as is_repost,
            NULL::timestamp with time zone as reposted_at,
            NULL::uuid as repost_user_id
           FROM posts p
           LEFT JOIN users u ON p.user_id = u.id
           WHERE p.user_id = $1`,
          [userId]
        );

        const repostedPostsResult = await query(
          `SELECT
            p.*,
            json_build_object(
              'id', u.id,
              'username', u.username,
              'display_name', u.display_name,
              'avatar_url', u.avatar_url,
              'wallet_address', u.wallet_address
            ) as user,
            true as is_repost,
            r.created_at as reposted_at,
            r.user_id as repost_user_id
           FROM reposts r
           JOIN posts p ON p.id = r.post_id
           LEFT JOIN users u ON p.user_id = u.id
           WHERE r.user_id = $1
             AND p.user_id <> $1
             AND p.visibility = 'public'`,
          [userId]
        );

        const merged = [...ownPostsResult.rows, ...repostedPostsResult.rows]
          .sort((a, b) => {
            const aTime = new Date(a.reposted_at || a.created_at).getTime();
            const bTime = new Date(b.reposted_at || b.created_at).getTime();
            return bTime - aTime;
          })
          .slice(offset, offset + limit);

        return merged;
      } catch (error) {
        console.error('Error fetching user posts with reposts:', error);
        throw error;
      }
    }

    const { data: ownPosts, error: ownError } = await supabase!
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ownError) {
      console.error('Error fetching own posts:', ownError);
      throw ownError;
    }

    const { data: repostRows, error: repostError } = await supabase!
      .from('reposts')
      .select(`
        created_at,
        user_id,
        post:posts!reposts_post_id_fkey (
          *,
          user:users!posts_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            wallet_address
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (repostError) {
      console.error('Error fetching reposts:', repostError);
      throw repostError;
    }

    const mappedOwnPosts = (ownPosts || []).map((post) => ({
      ...post,
      is_repost: false,
      reposted_at: null,
      repost_user_id: null,
    }));

    const mappedReposts = (repostRows || [])
      .filter((row: any) => row.post && row.post.user_id !== userId && row.post.visibility === 'public')
      .map((row: any) => ({
        ...(row.post as Record<string, unknown>),
        is_repost: true,
        reposted_at: row.created_at,
        repost_user_id: row.user_id,
      }));

    const merged = [...mappedOwnPosts, ...mappedReposts]
      .sort((a, b) => {
        const aTime = new Date((a.reposted_at as string) || (a.created_at as string)).getTime();
        const bTime = new Date((b.reposted_at as string) || (b.created_at as string)).getTime();
        return bTime - aTime;
      })
      .slice(offset, offset + limit);

    return merged;
  },

  // Create post
  async create(postData: {
    user_id: string;
    image_url?: string | null;
    caption?: string | null;
    visibility?: string;
    is_nft?: boolean;
    nft_price?: number | null;
  }): Promise<any> {
    const {
      user_id,
      image_url = null,
      caption = null,
      visibility = 'public',
      is_nft = false,
      nft_price = null,
    } = postData;

    if (useLocalDb) {
      try {
        const query = await getDbQuery();
        const result = await query(
          `INSERT INTO posts (
            user_id, image_url, caption, visibility, is_nft, nft_price,
            likes_count, comments_count, reposts_count
          ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0)
          RETURNING *`,
          [user_id, image_url, caption, visibility, is_nft, nft_price]
        );
        
        const post = result.rows[0];
        
        // Fetch user data
        const userResult = await query(
          `SELECT id, username, display_name, avatar_url, wallet_address
           FROM users WHERE id = $1`,
          [user_id]
        );
        
        return {
          ...post,
          user: userResult.rows[0] || null,
        };
      } catch (error) {
        console.error('Error creating post:', error);
        throw error;
      }
    }
    
    // Supabase
    const { data, error } = await supabase!
      .from('posts')
      .insert({
        user_id,
        image_url,
        caption,
        visibility,
        is_nft,
        nft_price: is_nft ? nft_price : null,
        likes_count: 0,
        comments_count: 0,
        reposts_count: 0,
      })
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
      console.error('Error creating post:', error);
      throw error;
    }
    
    return data;
  },
};

// User queries for API routes
export const userQueries = {
  // Get trending users
  async getTrending(limit: number = 5): Promise<any[]> {
    if (useLocalDb) {
      try {
        const query = await getDbQuery();
        const result = await query(
          `SELECT id, username, display_name, avatar_url, followers_count
           FROM users
           WHERE status = 'active' AND is_profile_complete = true
           ORDER BY followers_count DESC
           LIMIT $1`,
          [limit]
        );
        return result.rows || [];
      } catch (error) {
        console.error('Error fetching trending users:', error);
        throw error;
      }
    }
    
    // Supabase
    const { data, error } = await supabase!
      .from('users')
      .select('id, username, display_name, avatar_url, followers_count')
      .eq('status', 'active')
      .eq('is_profile_complete', true)
      .order('followers_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trending users:', error);
      throw error;
    }
    
    return data || [];
  },
};

export default supabase;
