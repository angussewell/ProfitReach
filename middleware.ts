import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define public routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/privacy-policy',
  '/terms-of-service',
  // Add any other public pages here
];

// Define API routes that should bypass auth check
const publicApiRoutes = [
  '/api/webhooks',
  '/api/aisuggestions',
  '/api/auth',
  '/api/no-auth-endpoint',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Checking path: ${pathname}`);

  // Allow public API routes
  const isPublicApiRoute = publicApiRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (isPublicApiRoute) {
    console.log(`[Middleware] Allowing public API route: ${pathname}`);
    return NextResponse.next();
  }

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Get authentication token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  const isAuthenticated = !!token;
  console.log(`[Middleware] Is authenticated: ${isAuthenticated}, Is public route: ${isPublicRoute}`);

  // If user is authenticated or on a public route, allow access
  if (isAuthenticated || isPublicRoute) {
    return NextResponse.next();
  }

  // User is not authenticated and trying to access a protected route
  console.log(`[Middleware] Redirecting unauthenticated user from ${pathname} to /auth/login`);
  const loginUrl = new URL('/auth/login', request.url);
  
  // Add the attempted URL as a callback parameter for better UX
  loginUrl.searchParams.set('callbackUrl', request.url);
  
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
