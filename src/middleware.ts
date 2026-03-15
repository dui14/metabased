import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Các route public không cần đăng nhập
const publicRoutes = ['/login', '/logout', '/home', '/discover'];

// Các route public có thể xem mà không cần login
const publicViewRoutes = ['/post/', '/profile/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Kiểm tra nếu là route public chính xác
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Kiểm tra nếu là route public view (post detail, profile)
  if (publicViewRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Kiểm tra auth token từ cookie (Dynamic Labs sẽ set cookie này)
  const authToken = request.cookies.get('dynamic_authentication_token')?.value;
  
  // Demo mode: check for demo_authenticated cookie
  const isDemoAuthenticated = request.cookies.get('demo_authenticated')?.value === 'true';
  
  // Nếu chưa đăng nhập, redirect về login (không thêm redirect param)
  if (!authToken && !isDemoAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Không thêm redirect param nữa
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|images).*)',
  ],
};
