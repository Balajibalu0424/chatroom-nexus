import { NextResponse } from 'next/server'

import { buildPushNotificationPayload, withDefaultUserSettings } from '@/lib/rich-messaging'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { Message, Room, UserSettings } from '@/lib/types'

export const runtime = 'nodejs'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@balajios.xyz'

interface RoomMessagePushBody {
  roomId?: string
  messageId?: string
  senderId?: string
}

interface PushSubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  keys: {
    auth: string
    p256dh: string
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RoomMessagePushBody
    if (!body.roomId || !body.messageId || !body.senderId) {
      return NextResponse.json({ error: 'Missing room message data' }, { status: 400 })
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ success: false, sent: 0, skipped: 'Push notifications are not configured' })
    }

    const supabase = getSupabaseAdminClient()
    const [{ data: message }, { data: room }, { data: senderMember }] = await Promise.all([
      supabase.from('messages').select('id, room_id, user_id, content, type').eq('id', body.messageId).maybeSingle(),
      supabase.from('rooms').select('id, name').eq('id', body.roomId).maybeSingle(),
      supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', body.roomId)
        .eq('user_id', body.senderId)
        .maybeSingle(),
    ])

    if (!message || !room || !senderMember || message.room_id !== body.roomId || message.user_id !== body.senderId) {
      return NextResponse.json({ error: 'Message is not eligible for push' }, { status: 403 })
    }

    const [{ data: sender }, { data: members }, { data: settingsRows }, { data: subscriptions }] = await Promise.all([
      supabase.from('users').select('id, username').eq('id', body.senderId).maybeSingle(),
      supabase.from('room_members').select('user_id, is_muted').eq('room_id', body.roomId).neq('user_id', body.senderId),
      supabase
        .from('user_settings')
        .select('user_id, notifications, message_preview, push_enabled, privacy_mode, muted_rooms')
        .neq('user_id', body.senderId),
      supabase.from('push_subscriptions').select('id, user_id, endpoint, keys').neq('user_id', body.senderId),
    ])

    const recipientMembers = (members ?? []) as Array<{ user_id: string; is_muted?: boolean | null }>
    const recipientIds = new Set(recipientMembers.filter((member) => !member.is_muted).map((member) => member.user_id))
    const settingsByUser = new Map<string, Partial<UserSettings>>(
      (settingsRows ?? []).map((settings: any) => [settings.user_id, settings])
    )
    const eligibleSubscriptions = ((subscriptions ?? []) as PushSubscriptionRow[]).filter((subscription) =>
      recipientIds.has(subscription.user_id) && Boolean(subscription.keys?.auth && subscription.keys?.p256dh)
    )

    if (eligibleSubscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0 })
    }

    const webpushModule = await import('web-push')
    const webpush = webpushModule.default ?? webpushModule
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    let sent = 0
    let failed = 0

    await Promise.all(
      eligibleSubscriptions.map(async (subscription) => {
        const payload = buildPushNotificationPayload({
          room: room as Pick<Room, 'id' | 'name'>,
          message: message as Pick<Message, 'id' | 'content' | 'type'>,
          senderName: sender?.username ?? 'Someone',
          settings: withDefaultUserSettings(settingsByUser.get(subscription.user_id)),
        })

        if (!payload) return

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            },
            JSON.stringify(payload)
          )
          sent += 1
        } catch (error: any) {
          failed += 1
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
          } else {
            console.error('Room push send error:', error)
          }
        }
      })
    )

    return NextResponse.json({ success: true, sent, failed })
  } catch (error) {
    console.error('Room message push route error:', error)
    return NextResponse.json({ error: 'Unable to send room push notifications' }, { status: 500 })
  }
}
