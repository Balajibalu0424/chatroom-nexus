import { NextResponse } from 'next/server'

import {
  authenticateAdminCredentials,
  buildAdminSessionCookie,
  issueAdminSession,
} from '@/lib/admin-auth'
import { limitAdminLogin } from '@/lib/admin-rate-limit'
import { getClientIp } from '@/lib/admin-request'

export const runtime = 'nodejs'

interface LoginRequestBody {
  username?: string
  password?: string
  totpCode?: string
}

export async function POST(request: Request) {
  try {
    const requestHeaders = new Headers(request.headers)
    const identifier = getClientIp(requestHeaders) ?? 'unknown'
    const rateLimit = await limitAdminLogin(identifier)

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many admin login attempts. Try again later.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    let body: LoginRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const totpCode = typeof body.totpCode === 'string' ? body.totpCode.replace(/\s+/g, '') : ''

    const authenticated = await authenticateAdminCredentials({
      username,
      password,
      totpCode,
    })

    if (!authenticated) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const sessionToken = await issueAdminSession(username)
    const response = NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } }
    )

    response.cookies.set(buildAdminSessionCookie(sessionToken))
    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Admin login is not configured correctly.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
