import { NextResponse } from 'next/server'

import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

interface SubscribeBody {
  userId?: string
  subscription?: PushSubscriptionJSON
  userAgent?: string | null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscribeBody
    const endpoint = body.subscription?.endpoint

    if (!body.userId || !endpoint || !body.subscription?.keys?.auth || !body.subscription?.keys?.p256dh) {
      return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: body.userId,
        endpoint,
        keys: body.subscription.keys,
        user_agent: body.userAgent ?? request.headers.get('user-agent'),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) {
      console.error('Push subscribe error:', error)
      return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscribe route error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
