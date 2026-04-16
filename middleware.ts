import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { verifyAdminSessionToken } from '@/lib/admin-session'

const PUBLIC_ADMIN_PATHS = new Set([
  '/admin/login',
  '/api/admin/login',
  '/api/admin/logout',
])

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!isAdminPath(pathname)) {
    return NextResponse.next()
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const secret = process.env.ADMIN_SESSION_SECRET
  const token = request.cookies.get('admin_session')?.value
  const session = secret && token ? await verifyAdminSessionToken(token, secret) : null

  if (!session) {
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
