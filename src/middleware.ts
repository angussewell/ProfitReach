import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Routes that require admin access
const ADMIN_ROUTES = [
  '/settings/users',
  '/settings/organization',
  '/settings/billing',
  '/settings/integrations',
  '/settings/api',
  '/settings/webhooks',
  '/prompts'
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
  '/user-settings'
];

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/webhooks/mail360',
  '/api/email-accounts/update-webhooks'
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

  // Exclude API routes and static files
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
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

    // Check admin routes
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route)) && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login as a safety measure
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 