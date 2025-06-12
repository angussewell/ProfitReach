import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TODO: Re-enable authentication and authorization logic
export function middleware(request: NextRequest) {
  // Simple pass-through for all requests in prototype mode
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  // Matcher ignoring `/_next/` and `/api/` routes
  // We keep the matcher config even though the middleware is bypassed
  // to avoid potential issues if it's removed entirely.
  // The middleware function above now handles all paths including /api/*.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
