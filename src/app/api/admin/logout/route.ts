import { NextResponse } from 'next/server'

import { buildClearedAdminSessionCookie } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url), 303)
  response.cookies.set(buildClearedAdminSessionCookie())
  return response
}
