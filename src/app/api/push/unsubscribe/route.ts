import { NextResponse } from 'next/server'

import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

interface UnsubscribeBody {
  userId?: string
  endpoint?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UnsubscribeBody
    if (!body.userId || !body.endpoint) {
      return NextResponse.json({ error: 'Missing push subscription' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', body.userId)
      .eq('endpoint', body.endpoint)

    if (error) {
      console.error('Push unsubscribe error:', error)
      return NextResponse.json({ error: 'Failed to remove push subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe route error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
