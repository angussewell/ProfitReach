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

  // DETAILED LOGGING START
  console.log(`[Middleware] Incoming Request: ${method} ${pathname}`);
  // DETAILED LOGGING END

  // Skip auth checks during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[Middleware] Skipping check: Production Build Phase');
    return NextResponse.next();
  }

  // BYPASS ALL SECURITY FOR SPECIFIC ENDPOINTS
  console.log('[Middleware] Checking bypass paths...'); // Log before check
  if (
    pathname.startsWith('/api/aisuggestions') ||
    pathname.startsWith('/api/admin/tasks-receive') ||
    pathname.startsWith('/api/admin/tasks-browser-store')
  ) {
    // Log which path triggered the bypass
    console.log(`[Middleware] Bypassing auth for: ${pathname}`);
    return NextResponse.next();
  }
  console.log('[Middleware] Path NOT bypassed:', pathname); // Log if not bypassed

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

  // Allow public API routes without authentication
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
     console.log('[Middleware] Allowing public API route:', pathname);
    return NextResponse.next();
  }

  // Exclude static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
     // console.log('[Middleware] Allowing static file/path:', pathname); // Optional: can be noisy
    return NextResponse.next();
  }

  console.log('[Middleware] Entering authentication block for:', pathname);
  try {
    // Only verify JWT token, don't initialize full auth
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
     console.log('[Middleware] Token:', token ? `Role: ${token.role}` : 'No token');

    // If there's no token and we're not on a public path, redirect to login
    if (!token && !PUBLIC_PATHS.includes(pathname)) {
       console.log('[Middleware] No token, redirecting to login for path:', pathname);
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname + request.nextUrl.search)); // Include search params
      return NextResponse.redirect(loginUrl);
    }

    // Check admin only routes - only admins can access these
    if (ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route)) && token?.role !== 'admin') {
      console.log(`[Middleware] Admin route access denied for role: ${token?.role}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check admin only API routes
    if (ADMIN_ONLY_API_ROUTES.some(route => pathname.startsWith(route)) && token?.role !== 'admin') {
      console.log(`[Middleware] Admin API route access denied for role: ${token?.role}`);
      return new NextResponse('Forbidden', { status: 403 });
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