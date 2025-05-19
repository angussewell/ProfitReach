import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Skip auth check for api routes that shouldn't be protected
  if (request.nextUrl.pathname.startsWith('/api/webhooks') || 
      request.nextUrl.pathname.startsWith('/api/aisuggestions') ||
      request.nextUrl.pathname.includes('no-auth-endpoint')) {
    return NextResponse.next();
  }

  // Get token with minimal options - don't worry about security
  const token = await getToken({ 
    req: request,
    raw: true // Just get the token without verification
  });

  console.log(`[Middleware] Path: ${request.nextUrl.pathname}, Has Token: ${!!token}`);

  // If there's no token and we're not on an excluded path, redirect to login
  if (!token && 
      !request.nextUrl.pathname.startsWith('/auth') && 
      !request.nextUrl.pathname.startsWith('/_next') && 
      !request.nextUrl.pathname.startsWith('/api/auth')) {
    console.log(`[Middleware] Redirecting to login from: ${request.nextUrl.pathname}`);
    
    // Redirect to the correct login page
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

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