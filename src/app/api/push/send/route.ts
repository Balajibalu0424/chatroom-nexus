import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

// Initialize Supabase with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, roomId, title, body, data } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found' }, { status: 200 })
    }

    // Import web-push dynamically
    const webpush = await import('web-push')
    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )

    // Send push notifications to all subscriptions
    const results = await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          const pushPayload = JSON.stringify({
            title: title || 'New message',
            body: body || '',
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: 'chatroom-notification',
            data: {
              roomId,
              ...data,
            },
          })

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            pushPayload
          )

          return { success: true, endpoint: sub.endpoint }
        } catch (err: any) {
          console.error('Push send error:', err)
          // Remove invalid subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }
          return { success: false, endpoint: sub.endpoint, error: err.message }
        }
      })
    )

    const successCount = results.filter((r: any) => r.success).length
    const failCount = results.filter((r: any) => !r.success).length

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      results,
    })
  } catch (error) {
    console.error('Push notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
