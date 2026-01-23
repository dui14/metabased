import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { query as dbQuery } from '@/lib/db';

const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/users/profile?wallet=0x... hoặc ?username=...
// Lấy thông tin profile user theo wallet address hoặc username
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');
    const username = searchParams.get('username');

    if (!walletAddress && !username) {
      return NextResponse.json(
        { error: 'Wallet address or username is required' },
        { status: 400 }
      );
    }

    let user: any = null;

    if (USE_LOCAL_DB) {
      // Query local PostgreSQL
      try {
        if (walletAddress) {
          const result = await dbQuery(
            'SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)',
            [walletAddress]
          );
          user = result.rows[0] || null;
        } else if (username) {
          const result = await dbQuery(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
          );
          user = result.rows[0] || null;
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }
    } else {
      // Query Supabase
      const supabase = createServerSupabaseClient()!;
      let query = supabase.from('users').select('*');
      
      if (walletAddress) {
        query = query.eq('wallet_address', walletAddress.toLowerCase());
      } else if (username) {
        query = query.ilike('username', username);
      }
      
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user:', error);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }

      user = data;
    }

    // Nếu không tìm thấy user, trả về null
    if (!user) {
      return NextResponse.json({ user: null, is_new: true });
    }

    return NextResponse.json({ 
      user,
      is_new: false,
      is_profile_complete: user.is_profile_complete 
    });
  } catch (error) {
    console.error('Error in GET /api/users/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users/profile
// Tạo user mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, email } = body;

    if (!wallet_address && !email) {
      return NextResponse.json(
        { error: 'At least wallet address or email is required' },
        { status: 400 }
      );
    }

    if (USE_LOCAL_DB) {
      // Local PostgreSQL logic
      try {
        // Kiểm tra conflict
        if (wallet_address) {
          const walletCheck = await dbQuery(
            'SELECT id, email FROM users WHERE LOWER(wallet_address) = LOWER($1)',
            [wallet_address]
          );
          const existingByWallet = walletCheck.rows[0];

          if (existingByWallet) {
            if (email && existingByWallet.email && existingByWallet.email.toLowerCase() !== email.toLowerCase()) {
              return NextResponse.json(
                { error: 'Wallet already linked to different email' },
                { status: 409 }
              );
            }
            if (email && !existingByWallet.email) {
              await dbQuery(
                'UPDATE users SET email = $1 WHERE id = $2',
                [email.toLowerCase(), existingByWallet.id]
              );
            }
            return NextResponse.json(
              { error: 'User already exists', user: existingByWallet },
              { status: 409 }
            );
          }
        }

        if (email) {
          const emailCheck = await dbQuery(
            'SELECT id, wallet_address FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
          );
          const existingByEmail = emailCheck.rows[0];

          if (existingByEmail) {
            if (wallet_address && existingByEmail.wallet_address && existingByEmail.wallet_address.toLowerCase() !== wallet_address.toLowerCase()) {
              return NextResponse.json(
                { error: 'Email already linked to different wallet' },
                { status: 409 }
              );
            }
            if (wallet_address && !existingByEmail.wallet_address) {
              await dbQuery(
                'UPDATE users SET wallet_address = $1 WHERE id = $2',
                [wallet_address.toLowerCase(), existingByEmail.id]
              );
            }
            return NextResponse.json(
              { error: 'User already exists', user: existingByEmail },
              { status: 409 }
            );
          }
        }

        // Tạo user mới
        const insertResult = await dbQuery(
          `INSERT INTO users (wallet_address, email, is_profile_complete, role, status)
           VALUES ($1, $2, false, 'user', 'active')
           RETURNING *`,
          [wallet_address?.toLowerCase() || null, email?.toLowerCase() || null]
        );
        const newUser = insertResult.rows[0];

        return NextResponse.json({ user: newUser }, { status: 201 });
      } catch (error) {
        console.error('Error creating user in local DB:', error);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    } else {
      // Supabase logic
      const supabase = createServerSupabaseClient()!;

      // Kiểm tra conflict: email đã thuộc user khác hoặc wallet đã thuộc user khác
      if (wallet_address) {
        const { data: existingByWallet } = await supabase
          .from('users')
          .select('id, email')
          .eq('wallet_address', wallet_address.toLowerCase())
          .maybeSingle();

        if (existingByWallet) {
          // Nếu user đã có với wallet này
          if (email && existingByWallet.email && existingByWallet.email !== email.toLowerCase()) {
            return NextResponse.json(
              { error: 'Wallet already linked to different email' },
              { status: 409 }
            );
          }
          // Nếu chưa có email, update email vào
          if (email && !existingByWallet.email) {
            await supabase
              .from('users')
              .update({ email: email.toLowerCase() })
              .eq('id', existingByWallet.id);
          }
          return NextResponse.json(
            { error: 'User already exists', user: existingByWallet },
            { status: 409 }
          );
        }
      }

      if (email) {
        const { data: existingByEmail } = await supabase
          .from('users')
          .select('id, wallet_address')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingByEmail) {
          // Nếu user đã có với email này
          if (wallet_address && existingByEmail.wallet_address && existingByEmail.wallet_address !== wallet_address.toLowerCase()) {
            return NextResponse.json(
              { error: 'Email already linked to different wallet' },
              { status: 409 }
            );
          }
          // Nếu chưa có wallet, update wallet vào
          if (wallet_address && !existingByEmail.wallet_address) {
            await supabase
              .from('users')
              .update({ wallet_address: wallet_address.toLowerCase() })
              .eq('id', existingByEmail.id);
          }
          return NextResponse.json(
            { error: 'User already exists', user: existingByEmail },
            { status: 409 }
          );
        }
      }

      // Tạo user mới
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          wallet_address: wallet_address?.toLowerCase() || null,
          email: email?.toLowerCase() || null,
          is_profile_complete: false,
          role: 'user',
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      return NextResponse.json({ user: newUser }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in POST /api/users/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/profile
// Cập nhật profile user (username, display_name, bio, avatar_url, email)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, username, display_name, bio, avatar_url, email } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (USE_LOCAL_DB) {
      // Local PostgreSQL logic
      try {
        // Nếu có username, kiểm tra xem đã được sử dụng chưa
        if (username) {
          const usernameCheck = await dbQuery(
            'SELECT id, wallet_address FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
          );
          const existingUsername = usernameCheck.rows[0];

          if (existingUsername && existingUsername.wallet_address.toLowerCase() !== wallet_address.toLowerCase()) {
            return NextResponse.json(
              { error: 'Username already taken', message: 'Username này đã được sử dụng' },
              { status: 409 }
            );
          }
        }

        // Kiểm tra user có tồn tại không
        const userCheck = await dbQuery(
          'SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)',
          [wallet_address]
        );
        const existingUser = userCheck.rows[0];

        if (!existingUser) {
          // Tạo user mới với thông tin profile
          const hasAllInfo = !!(wallet_address && email && username && display_name);
          
          const insertResult = await dbQuery(
            `INSERT INTO users (wallet_address, username, display_name, bio, avatar_url, email, is_profile_complete, role, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', 'active')
             RETURNING *`,
            [
              wallet_address.toLowerCase(),
              username?.toLowerCase() || null,
              display_name || null,
              bio || null,
              avatar_url || null,
              email?.toLowerCase() || null,
              hasAllInfo
            ]
          );
          
          return NextResponse.json({ user: insertResult.rows[0] });
        } else {
          // Cập nhật user
          const finalEmail = email !== undefined ? email : existingUser.email;
          const finalUsername = username !== undefined ? username : existingUser.username;
          const finalDisplayName = display_name !== undefined ? display_name : existingUser.display_name;
          const finalBio = bio !== undefined ? bio : existingUser.bio;
          const finalAvatarUrl = avatar_url !== undefined ? avatar_url : existingUser.avatar_url;
          
          const hasAllInfo = !!(wallet_address && finalEmail && finalUsername && finalDisplayName);

          const updateResult = await dbQuery(
            `UPDATE users 
             SET username = $1, display_name = $2, bio = $3, avatar_url = $4, 
                 email = $5, is_profile_complete = $6, updated_at = NOW()
             WHERE LOWER(wallet_address) = LOWER($7)
             RETURNING *`,
            [
              finalUsername?.toLowerCase() || null,
              finalDisplayName,
              finalBio,
              finalAvatarUrl,
              finalEmail?.toLowerCase() || null,
              hasAllInfo,
              wallet_address
            ]
          );

          if (updateResult.rows.length === 0) {
            return NextResponse.json(
              { error: 'User not found' },
              { status: 404 }
            );
          }

          return NextResponse.json({ user: updateResult.rows[0] });
        }
      } catch (error) {
        console.error('Error updating user in local DB:', error);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    } else {
      // Supabase logic
      const supabase = createServerSupabaseClient()!;

      // Nếu có username, kiểm tra xem đã được sử dụng chưa
      if (username) {
        const { data: existingUsername } = await supabase
          .from('users')
          .select('id, wallet_address')
          .eq('username', username.toLowerCase())
          .single();

        if (existingUsername && existingUsername.wallet_address !== wallet_address.toLowerCase()) {
          return NextResponse.json(
            { error: 'Username already taken', message: 'Username này đã được sử dụng' },
            { status: 409 }
          );
        }
      }

      // Kiểm tra user có tồn tại không, nếu không thì tạo mới
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', wallet_address.toLowerCase())
        .single();

      let result;
      
      if (!existingUser) {
        // Tạo user mới với thông tin profile
        // Profile complete khi có đủ: wallet, email, username, display_name
        const hasAllInfo = !!(wallet_address && email && username && display_name);
        
        result = await supabase
          .from('users')
          .insert({
            wallet_address: wallet_address.toLowerCase(),
            username: username?.toLowerCase(),
            display_name,
            bio,
            avatar_url,
            email: email?.toLowerCase() || null,
            is_profile_complete: hasAllInfo,
            role: 'user',
            status: 'active',
          })
          .select()
          .single();
      } else {
        // Cập nhật user
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        
        if (username !== undefined) updateData.username = username?.toLowerCase();
        if (display_name !== undefined) updateData.display_name = display_name;
        if (bio !== undefined) updateData.bio = bio;
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
        if (email !== undefined) updateData.email = email?.toLowerCase();
        
        // Đánh dấu profile complete nếu có đủ thông tin: wallet, email, username, display_name
        const finalWallet = wallet_address;
        const finalEmail = email !== undefined ? email : existingUser.email;
        const finalUsername = username !== undefined ? username : existingUser.username;
        const finalDisplayName = display_name !== undefined ? display_name : existingUser.display_name;
        
        const hasAllInfo = !!(finalWallet && finalEmail && finalUsername && finalDisplayName);
        updateData.is_profile_complete = hasAllInfo;

        result = await supabase
          .from('users')
          .update(updateData)
          .eq('wallet_address', wallet_address.toLowerCase())
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error updating user:', result.error);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({ user: result.data });
    }
  } catch (error) {
    console.error('Error in PUT /api/users/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
