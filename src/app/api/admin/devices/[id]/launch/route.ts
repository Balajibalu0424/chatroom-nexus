import { NextResponse } from 'next/server'

import { getAdminSessionFromCookieHeader } from '@/lib/admin-auth'
import { createAdminLaunchDescriptor, isAdminLaunchMode } from '@/lib/admin-devices'
import { getClientIp, getUserAgent } from '@/lib/admin-request'

export const runtime = 'nodejs'

interface LaunchRequestBody {
  mode?: string
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSessionFromCookieHeader(request.headers.get('cookie'))
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: LaunchRequestBody = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const mode = body.mode
  if (!mode || !isAdminLaunchMode(mode)) {
    return NextResponse.json({ error: 'Invalid launch mode' }, { status: 400 })
  }

  try {
    const descriptor = await createAdminLaunchDescriptor({
      deviceId: params.id,
      mode,
      adminUsername: session.username,
      ipAddress: getClientIp(new Headers(request.headers)),
      userAgent: getUserAgent(new Headers(request.headers)),
    })

    return NextResponse.json(descriptor)
  } catch (error) {
    if (error instanceof Error && error.message === 'Device not found') {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    console.error('Admin launch error:', error)
    return NextResponse.json({ error: 'Unable to create remote session' }, { status: 500 })
  }
}
