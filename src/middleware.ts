import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// List of public routes that don't require authentication
const publicRoutes = ['/api/auth', '/', '/login', '/error'];

export const runtime = 'experimental-edge';

export async function middleware(request: NextRequest) {
  // Check if the requested path is public
  const isPublicPath = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  try {
    // Verify the session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
      // Redirect to home page if not authenticated
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 