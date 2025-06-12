import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('🚀 MIDDLEWARE WORKING! Path:', pathname)

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/privacy-policy', '/terms-of-service']
  const publicApiRoutes = ['/api/webhooks', '/api/auth', '/api/no-auth-endpoint']

  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    console.log('🚀 ALLOWING API:', pathname)
    return NextResponse.next()
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    console.log('🚀 ALLOWING PUBLIC:', pathname)
    return NextResponse.next()
  }

  // Check authentication
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    if (token) {
      console.log('🚀 USER AUTHENTICATED, allowing:', pathname)
      return NextResponse.next()
    }

    console.log('🚀 NO AUTH TOKEN - REDIRECTING TO LOGIN from:', pathname)
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(loginUrl)
    
  } catch (error) {
    console.log('🚀 AUTH ERROR:', error)
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}