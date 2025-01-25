import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function middleware(request: NextRequest) {
  // Skip auth check for public routes
  if (
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const hasAuth = request.cookies.has('ghl_auth');
  
  if (!hasAuth) {
    // If no auth cookie exists, redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 