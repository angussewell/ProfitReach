import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Routes that only admins can access (not managers)
const ADMIN_ONLY_ROUTES = [
  '/settings/users',
  '/settings/organization',
  '/settings/billing',
  '/settings/integrations',
  '/settings/api',
  '/settings/webhooks',
  '/settings',
  '/prompts',
  '/chat'
];

// API routes that only admins can access
const ADMIN_ONLY_API_ROUTES = [
  '/api/settings',
  '/api/prompts',
  '/api/chat'
];

// Routes that both admins and managers can access
const MANAGER_ROUTES = [
  '/universal-inbox',
  '/webhook-logs',
  '/accounts'
];

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/universal-inbox',
  '/scenarios',
  '/settings/scenarios',
  '/snippets',
  '/attachments',
  '/webhook-logs',
  '/email-accounts',
  '/settings',
  '/prompts',
  '/user-settings',
  '/accounts',
  '/chat'
];

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/webhooks/mail360',
  '/api/email-accounts/update-webhooks',
  '/api/auth'  // Allow all NextAuth endpoints
];

const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  // Skip auth checks during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Handle root path redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/scenarios', request.url));
  }

  // Check if the path is public
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public API routes without authentication
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Exclude static files
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  try {
    // Only verify JWT token, don't initialize full auth
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token and we're not on a public path, redirect to login
    if (!token && !PUBLIC_PATHS.includes(pathname)) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
      return NextResponse.redirect(loginUrl);
    }

    // Check admin only routes - only admins can access these
    if (ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route)) && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check admin only API routes
    if (ADMIN_ONLY_API_ROUTES.some(route => pathname.startsWith(route)) && token?.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check manager routes - only admins and managers can access these
    if (MANAGER_ROUTES.some(route => pathname.startsWith(route)) && 
        token?.role !== 'admin' && token?.role !== 'manager') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Return appropriate response based on whether it's an API route
    if (pathname.startsWith('/api/')) {
      // For API routes, return a proper JSON error response
      return new NextResponse(
        JSON.stringify({ 
          error: 'Authentication Error', 
          message: 'Failed to authenticate request' 
        }),
        { 
          status: 401, 
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // For non-API routes, redirect to login as before
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 