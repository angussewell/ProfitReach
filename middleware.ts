import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secureCookie: process.env.NODE_ENV === 'production'
  });

  // Debug logging (will appear in server logs)
  console.log(`[Middleware] Path: ${request.nextUrl.pathname}, Has Token: ${!!token}`);

  // If there's no token and we're not on the login page, redirect to login
  if (!token && !request.nextUrl.pathname.startsWith('/auth')) {
    console.log(`[Middleware] Redirecting to login: ${request.nextUrl.pathname}`);
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (authentication routes)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
}; 