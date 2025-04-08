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
  '/api/aisuggestions',
  '/api/admin/tasks-receive',
  '/api/admin/tasks-browser-store',
  '/api/auth'  // Allow all NextAuth endpoints
];

const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  console.log(`[Middleware] Incoming Request: ${method} ${pathname}`);

  // Skip auth checks during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[Middleware] Skipping check: Production Build Phase');
    return NextResponse.next();
  }

  // BYPASS ALL SECURITY FOR API ROUTES
  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] Bypassing auth for API route: ${pathname}`);
    return NextResponse.next();
  }

  // Handle root path redirect
  if (pathname === '/') {
    console.log('[Middleware] Redirecting root path');
    return NextResponse.redirect(new URL('/scenarios', request.url));
  }

  // Check if the path is public
  if (PUBLIC_PATHS.includes(pathname)) {
    console.log('[Middleware] Allowing public path:', pathname);
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

  console.log('[Middleware] Entering authentication block for:', pathname);
  try {
    // Only verify JWT token, don't initialize full auth
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    // Enhanced logging to trace organization context
    if (token) {
      console.log('[Middleware] Token:', {
        role: token.role,
        userId: token.sub,
        email: token.email,
        orgId: token.organizationId,
      });
    } else {
      console.log('[Middleware] No token available');
    }

    // If there's no token and we're not on a public path, redirect to login
    if (!token && !PUBLIC_PATHS.includes(pathname)) {
      console.log('[Middleware] No token, redirecting to login for path:', pathname);
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname + request.nextUrl.search));
      return NextResponse.redirect(loginUrl);
    }

    // Check admin only routes - only admins can access these
    if (ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route)) && token?.role !== 'admin') {
      console.log(`[Middleware] Admin route access denied for role: ${token?.role}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check manager routes - only admins and managers can access these
    if (MANAGER_ROUTES.some(route => pathname.startsWith(route)) && 
        token?.role !== 'admin' && token?.role !== 'manager') {
      console.log(`[Middleware] Manager route access denied for role: ${token?.role}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.log('[Middleware] Proceeding with request for path:', pathname);
    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware] Error:', error);
    
    // For non-API routes, redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
