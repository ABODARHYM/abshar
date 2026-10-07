import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // الصفحات العامة
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.next()
  }

  // الصفحات المحمية
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
