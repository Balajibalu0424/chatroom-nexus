import { NextResponse } from 'next/server'

import { getAdminSessionFromCookieHeader } from '@/lib/admin-auth'
import { listAdminDevices } from '@/lib/admin-devices'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await getAdminSessionFromCookieHeader(request.headers.get('cookie'))
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const devices = await listAdminDevices()
    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Admin devices list error:', error)
    return NextResponse.json({ error: 'Admin device catalog is unavailable' }, { status: 500 })
  }
}
