import type { Message, Room, UserSettings } from '@/lib/types'

export const DEFAULT_USER_SETTINGS: UserSettings = {
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

export type GifRating = NonNullable<UserSettings['gif_rating']>

export interface PushNotificationPayload {
  title: string
  body: string
  icon: string
  badge: string
  tag: string
  data: {
    roomId: string
    messageId: string
    type: Message['type']
  }
}

export function withDefaultUserSettings(settings?: Partial<UserSettings> | null): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...(settings ?? {}),
    muted_rooms: settings?.muted_rooms ?? DEFAULT_USER_SETTINGS.muted_rooms,
  }
}

export function isRoomMuted(settings: Partial<UserSettings> | null | undefined, roomId: string): boolean {
  return Boolean(settings?.muted_rooms?.includes(roomId))
}

export function normalizeGifRating(value: string | undefined | null): GifRating {
  return value === 'pg' ? 'pg' : 'g'
}

export function sanitizeGifSearchQuery(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
}

export function getMessagePreview(message: Pick<Message, 'content' | 'type'>, settings?: Partial<UserSettings>): string {
  const normalizedSettings = withDefaultUserSettings(settings)

  switch (message.type) {
    case 'gif':
      return 'sent a GIF'
    case 'sticker':
      return 'sent a sticker'
    case 'image':
      return 'sent an image'
    case 'file':
      return 'sent a file'
    case 'voice':
      return 'sent a voice message'
    default:
      break
  }

  if (!normalizedSettings.message_preview || normalizedSettings.privacy_mode === 'private') {
    return 'sent a message'
  }

  const preview = message.content.replace(/\s+/g, ' ').trim()
  if (!preview) return 'sent a message'
  return preview.length > 72 ? `${preview.slice(0, 69)}...` : preview
}

export function buildPushNotificationPayload(input: {
  room: Pick<Room, 'id' | 'name'>
  message: Pick<Message, 'id' | 'content' | 'type'>
  senderName: string
  settings?: Partial<UserSettings> | null
}): PushNotificationPayload | null {
  const settings = withDefaultUserSettings(input.settings)
  if (!settings.notifications || !settings.push_enabled || isRoomMuted(settings, input.room.id)) {
    return null
  }

  const preview = getMessagePreview(
    {
      content: '',
      type: input.message.type,
    },
    { ...settings, message_preview: false, privacy_mode: 'private' }
  )

  return {
    title: `New message in ${input.room.name}`,
    body: `${input.senderName} ${preview}`,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: `room-${input.room.id}`,
    data: {
      roomId: input.room.id,
      messageId: input.message.id,
      type: input.message.type,
    },
  }
}
