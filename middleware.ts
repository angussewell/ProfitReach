import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Ultra simple fix - just redirect to the root path
  // This avoids any complex route matching and is the simplest path forward
  if (request.nextUrl.pathname === '/scenarios') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/scenarios'],
}; 