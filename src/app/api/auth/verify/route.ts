import { NextRequest, NextResponse } from 'next/server';
import { verifyAndGetUser } from '@/lib/jwt';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/verify
 * Verify JWT token từ Dynamic Labs
 */
export async function POST(request: NextRequest) {
  try {
    // Lấy token từ header hoặc body
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const body = await request.json().catch(() => ({}));
      token = body.token;
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', valid: false },
        { status: 400 }
      );
    }
    
    // Verify JWT bằng JWKS từ Dynamic Labs
    const user = await verifyAndGetUser(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token', valid: false },
        { status: 401 }
      );
    }
    
    // Kiểm tra token đã hết hạn chưa
    if (user.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token expired', valid: false },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      valid: true,
      user: {
        id: user.userId,
        email: user.email,
        walletAddress: user.walletAddress,
        sessionId: user.sessionId,
        expiresAt: user.expiresAt.toISOString(),
      }
    });
    
  } catch (error) {
    console.error('Auth verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/verify
 * Check if current user is authenticated (via cookie)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('dynamic_authentication_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'No token found' },
        { status: 401 }
      );
    }
    
    const user = await verifyAndGetUser(token);
    
    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.userId,
        email: user.email,
        walletAddress: user.walletAddress,
      }
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
