import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { verifyAndGetUser } = await import('@/lib/jwt');
    const userInfo = await verifyAndGetUser(token);
    
    if (!userInfo?.walletAddress) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: user } = await supabase
      .from('users')
      .select('message_permission')
      .eq('wallet_address', userInfo.walletAddress)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message_permission: user.message_permission || 'everyone' 
    });
  } catch (error) {
    console.error('Error in GET /api/users/message-settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { verifyAndGetUser } = await import('@/lib/jwt');
    const userInfo = await verifyAndGetUser(token);
    
    if (!userInfo?.walletAddress) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message_permission } = body;

    if (!message_permission || !['everyone', 'following'].includes(message_permission)) {
      return NextResponse.json(
        { error: 'Invalid message_permission value' },
        { status: 400 }
      );
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ message_permission })
      .eq('wallet_address', userInfo.walletAddress)
      .select('message_permission')
      .single();

    if (error) {
      console.error('Error updating message settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message_permission: updatedUser.message_permission,
      success: true 
    });
  } catch (error) {
    console.error('Error in PUT /api/users/message-settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
