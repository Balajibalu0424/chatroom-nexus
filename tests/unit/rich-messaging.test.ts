import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPushNotificationPayload,
  getMessagePreview,
  normalizeGifRating,
  sanitizeGifSearchQuery,
} from '@/lib/rich-messaging'
import type { Message, Room, UserSettings } from '@/lib/types'

const baseMessage: Message = {
  id: 'message-1',
  room_id: 'room-1',
  user_id: 'user-1',
  content: 'This is a private message with sensitive details',
  type: 'text',
  created_at: '2026-05-10T10:00:00.000Z',
}

const baseRoom: Room = {
  id: 'room-1',
  name: 'Ops Room',
  code: 'OPS123',
  is_locked: true,
  created_at: '2026-05-10T09:00:00.000Z',
}

const baseSettings: UserSettings = {
  theme: 'dark',
  notifications: true,
  sound_enabled: true,
  message_preview: true,
  push_enabled: true,
  privacy_mode: 'balanced',
  media_autoplay: false,
  reduced_motion: false,
  effects_3d: true,
  gif_rating: 'g',
  muted_rooms: [],
  sound_volume: 0.5,
}

test('message preview hides full content when previews are disabled', () => {
  assert.equal(
    getMessagePreview(baseMessage, { ...baseSettings, message_preview: false }),
    'sent a message'
  )
})

test('message preview uses media-safe summaries for rich content', () => {
  assert.equal(getMessagePreview({ ...baseMessage, type: 'gif' }, baseSettings), 'sent a GIF')
  assert.equal(getMessagePreview({ ...baseMessage, type: 'sticker' }, baseSettings), 'sent a sticker')
  assert.equal(getMessagePreview({ ...baseMessage, type: 'image' }, baseSettings), 'sent an image')
})

test('push payload never includes full private message content', () => {
  const payload = buildPushNotificationPayload({
    room: baseRoom,
    message: baseMessage,
    senderName: 'Balaji',
    settings: baseSettings,
  })

  assert.equal(payload.title, 'New message in Ops Room')
  assert.equal(payload.body, 'Balaji sent a message')
  assert.equal(JSON.stringify(payload).includes(baseMessage.content), false)
  assert.equal(payload.data.roomId, baseRoom.id)
  assert.equal(payload.data.messageId, baseMessage.id)
})

test('muted rooms suppress push payloads', () => {
  const payload = buildPushNotificationPayload({
    room: baseRoom,
    message: baseMessage,
    senderName: 'Balaji',
    settings: { ...baseSettings, muted_rooms: [baseRoom.id] },
  })

  assert.equal(payload, null)
})

test('GIF search query and rating are constrained for safe provider calls', () => {
  assert.equal(sanitizeGifSearchQuery('  hello\nworld\t'.repeat(4)), 'hello world hello world hello world hello world')
  assert.equal(sanitizeGifSearchQuery('x'.repeat(80)).length, 50)
  assert.equal(normalizeGifRating('pg'), 'pg')
  assert.equal(normalizeGifRating('r'), 'g')
  assert.equal(normalizeGifRating(undefined), 'g')
})
