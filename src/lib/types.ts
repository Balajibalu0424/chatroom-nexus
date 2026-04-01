export interface User {
  id: string
  username: string
  avatar_color: string
  pin_hash: string
  created_at: string
  last_seen: string
}

export interface Session {
  id: string
  user_id: string
  device_info?: string
  created_at: string
  last_active: string
}

export interface Room {
  id: string
  name: string
  code: string
  pin_hash?: string | null
  created_by?: string | null
  is_locked: boolean
  created_at: string
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  type: 'text' | 'image' | 'file' | 'sticker' | 'voice'
  file_url?: string | null
  file_name?: string | null
  reply_to?: string | null
  created_at: string
  updated_at?: string | null
  is_deleted?: boolean
  reactions?: MessageReaction[]
  sender?: {
    id?: string
    username: string
    avatar_color: string
  }
  status?: 'sending' | 'sent' | 'delivered' | 'seen'
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: {
    id?: string
    username: string
  }
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  joined_at: string
  is_online?: boolean
  user?: User
}

export interface TypingStatus {
  room_id: string
  user_id: string
  username: string
  is_typing: boolean
  updated_at: string
}

export interface PresenceState {
  [roomId: string]: {
    [userId: string]: {
      username: string
      avatar_color: string
      online_at: string
    }
  }
}

export interface Attachment {
  id: string
  message_id: string
  user_id: string
  file_url: string
  file_name?: string
  file_type?: string
  file_size?: number
  created_at: string
}

export interface Sticker {
  id: string
  name: string
  url: string
  pack: string
  created_at: string
}

export interface RoomAccessLog {
  id: string
  room_id: string
  user_id?: string
  action: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface RateLimit {
  id: string
  identifier: string
  action: string
  count: number
  window_start: string
}
