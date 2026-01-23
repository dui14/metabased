import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { query } from '@/lib/db';

const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/users/verify-auth
// Verify rằng email và wallet đều khớp với user trong DB
// Trả về user nếu match, hoặc error nếu không match
// Yêu cầu: user phải có đầy đủ wallet, email, username, display_name mới được vào home
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, wallet_address } = body;

    if (!email && !wallet_address) {
      return NextResponse.json(
        { error: 'Email or wallet address is required' },
        { status: 400 }
      );
    }

    const supabase = USE_LOCAL_DB ? null : createServerSupabaseClient();

    // Case 1: User có cả email và wallet - verify cả 2 khớp với cùng 1 user
    if (email && wallet_address) {
      let userByWallet: any = null;
      let userByEmail: any = null;

      if (USE_LOCAL_DB) {
        // Query local PostgreSQL
        try {
          const walletResult = await query(
            'SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)',
            [wallet_address]
          );
          userByWallet = walletResult.rows[0] || null;

          const emailResult = await query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
          );
          userByEmail = emailResult.rows[0] || null;
        } catch (error) {
          return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          );
        }
      } else {
        // Query Supabase
        const { data: walletData, error: walletError } = await supabase!
          .from('users')
          .select('*')
          .eq('wallet_address', wallet_address.toLowerCase())
          .maybeSingle();

        const { data: emailData, error: emailError } = await supabase!
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (walletError || emailError) {
          console.error('Error fetching user:', walletError || emailError);
          return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          );
        }

        userByWallet = walletData;
        userByEmail = emailData;
      }

      // Case 1a: Cả email và wallet đều chưa có trong DB → User hoàn toàn mới
      if (!userByWallet && !userByEmail) {
        return NextResponse.json({ 
          verified: false,
          is_new: true,
          needs_creation: true,
          message: 'User not found, need to create with email and wallet'
        });
      }

      // Case 1b: Wallet có nhưng email khác → CONFLICT
      if (userByWallet && userByEmail && userByWallet.id !== userByEmail.id) {
        return NextResponse.json({ 
          verified: false,
          error: 'Email and wallet belong to different users',
          conflict: true,
          message: 'Email và ví không khớp với tài khoản. Vui lòng đăng nhập lại với thông tin đúng.'
        }, { status: 409 });
      }

      // Case 1c: Có wallet nhưng chưa có email → Update email vào
      if (userByWallet && !userByWallet.email) {
        try {
          if (USE_LOCAL_DB) {
            await query(
              'UPDATE users SET email = $1 WHERE id = $2',
              [email.toLowerCase(), userByWallet.id]
            );
          } else {
            const { error: updateError } = await supabase!
              .from('users')
              .update({ email: email.toLowerCase() })
              .eq('id', userByWallet.id);
            if (updateError) throw updateError;
          }
          userByWallet.email = email.toLowerCase();
        } catch (error) {
          console.error('Error updating email:', error);
        }
      }

      // Case 1d: Có email nhưng chưa có wallet → Update wallet vào
      if (userByEmail && !userByEmail.wallet_address) {
        try {
          if (USE_LOCAL_DB) {
            await query(
              'UPDATE users SET wallet_address = $1 WHERE id = $2',
              [wallet_address.toLowerCase(), userByEmail.id]
            );
          } else {
            const { error: updateError } = await supabase!
              .from('users')
              .update({ wallet_address: wallet_address.toLowerCase() })
              .eq('id', userByEmail.id);
            if (updateError) throw updateError;
          }
          userByEmail.wallet_address = wallet_address.toLowerCase();
        } catch (error) {
          console.error('Error updating wallet:', error);
        }
      }

      const user = userByWallet || userByEmail;
      
      // Kiểm tra profile đã đầy đủ chưa
      // Yêu cầu: wallet, email, username, display_name
      const hasAllInfo = user.wallet_address && user.email && user.username && user.display_name;
      const needsProfileSetup = !hasAllInfo;

      return NextResponse.json({ 
        verified: true,
        user,
        is_new: false,
        is_profile_complete: hasAllInfo && user.is_profile_complete,
        needs_profile_setup: needsProfileSetup,
        missing_fields: {
          wallet: !user.wallet_address,
          email: !user.email,
          username: !user.username,
          display_name: !user.display_name
        }
      });
    }

    // Case 2: Chỉ có email - kiểm tra user có tồn tại với email đó không
    if (email) {
      let user: any = null;

      if (USE_LOCAL_DB) {
        try {
          const result = await query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
          );
          user = result.rows[0] || null;
        } catch (error) {
          return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          );
        }
      } else {
        const { data, error } = await supabase!
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error('Error fetching user by email:', error);
          return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          );
        }
        user = data;
      }

      if (!user) {
        // Email chưa tồn tại - user mới cần link wallet
        return NextResponse.json({ 
          verified: false,
          is_new: true,
          needs_wallet: true,
          message: 'Email not found, need to link wallet'
        });
      }

      const hasAllInfo = user.wallet_address && user.email && user.username && user.display_name;
      
      return NextResponse.json({ 
        verified: true,
        user,
        is_new: false,
        needs_wallet: !user.wallet_address,
        is_profile_complete: hasAllInfo && user.is_profile_complete,
        needs_profile_setup: !hasAllInfo,
        missing_fields: {
          wallet: !user.wallet_address,
          email: !user.email,
          username: !user.username,
          display_name: !user.display_name
        }
      });
    }

    // Case 3: Chỉ có wallet
    if (wallet_address) {
      let user: any = null;

      if (USE_LOCAL_DB) {
        try {
          const result = await query(
            'SELECT * FROM users WHERE LOWER(wallet_address) = LOWER($1)',
            [wallet_address]
          );
          user = result.rows[0] || null;
        } catch (error) {
          return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          );
        }
      } else {
        const { data, error } = await supabase!
          .from('users')
          .select('*')
          .eq('wallet_address', wallet_address.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error('Error fetching user by wallet:', error);
          return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          );
        }
        user = data;
      }

      if (!user) {
        return NextResponse.json({ 
          verified: false,
          is_new: true,
          needs_creation: true,
          message: 'Wallet not found, need to create'
        });
      }

      const hasAllInfo = user.wallet_address && user.email && user.username && user.display_name;
      
      return NextResponse.json({ 
        verified: true,
        user,
        is_new: false,
        is_profile_complete: hasAllInfo && user.is_profile_complete,
        needs_profile_setup: !hasAllInfo,
        missing_fields: {
          wallet: !user.wallet_address,
          email: !user.email,
          username: !user.username,
          display_name: !user.display_name
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in POST /api/users/verify-auth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
