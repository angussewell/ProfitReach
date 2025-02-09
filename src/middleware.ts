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
  '/scenarios',
  '/settings/scenarios',
  '/snippets',
  '/attachments',
  '/webhook-logs',
  '/email-accounts',
  '/settings',
  '/prompts'
];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const path = request.nextUrl.pathname;

  console.log('Middleware processing request:', {
    path,
    hasToken: !!token,
    method: request.method
  });

  // If it's an API route, let the API handle authorization
  if (path.startsWith('/api')) {
    console.log('API route detected, passing through:', {
      path,
      hasToken: !!token,
      tokenData: token ? {
        role: token.role,
        hasOrgId: !!token.organizationId,
        email: token.email,
        exp: token.exp
      } : null,
      headers: Object.fromEntries(request.headers.entries())
    });
    return NextResponse.next();
  }

  // Check if the path requires protection
  const isProtectedRoute = PROTECTED_ROUTES.some(route => path.startsWith(route));

  // Redirect to login if accessing a protected route without being authenticated
  if (isProtectedRoute && !token) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Check admin routes - exact match for /settings or specific settings routes
  const isAdminRoute = ADMIN_ROUTES.some(route => {
    if (route === '/settings') {
      return path === '/settings'; // Exact match for main settings page
    }
    return path.startsWith(route); // Prefix match for specific admin routes
  });
  
  if (isAdminRoute && token?.role !== 'admin') {
    // Redirect to home page if not admin
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 