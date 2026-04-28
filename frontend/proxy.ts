import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths accessible without a token
const PUBLIC_PATHS = ['/', '/login']

export function proxy(request: NextRequest) {
  const token = request.cookies.get('obs_token')?.value
  const { pathname } = request.nextUrl

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PATHS.some((p) => p !== '/' && pathname.startsWith(p + '/'))

  // Unauthenticated on a protected route → landing page at /
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  // Already logged in → skip landing/login, go straight to dashboard
  if (token && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
