import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Auth routes are public
  if (pathname.startsWith('/auth')) {
    if (token) {
      return NextResponse.redirect(new URL('/scenarios', request.url))
    }
    return NextResponse.next()
  }

  // API routes don't need auth check
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Check auth for all other routes
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
} 