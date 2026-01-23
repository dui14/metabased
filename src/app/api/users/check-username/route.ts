import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { query as dbQuery } from '@/lib/db';

const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/users/check-username?username=xxx
// Kiểm tra xem username có sẵn không
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return NextResponse.json(
        { available: false, error: 'Invalid username format' },
        { status: 400 }
      );
    }

    let available = false;

    if (USE_LOCAL_DB) {
      // Query local PostgreSQL
      try {
        const result = await dbQuery(
          'SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
          [username]
        );
        // Username available nếu không tìm thấy
        available = result.rows.length === 0;
      } catch (error) {
        console.error('Error checking username (Local DB):', error);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }
    } else {
      // Query Supabase
      const supabase = createServerSupabaseClient();
      
      if (!supabase) {
        return NextResponse.json(
          { error: 'Database connection error' },
          { status: 500 }
        );
      }

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      // If no data found (error code PGRST116), username is available
      available = !data && error?.code === 'PGRST116';

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking username (Supabase):', error);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ available });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
