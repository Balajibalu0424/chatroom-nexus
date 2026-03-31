export interface User {
  id: string
  username: string
  avatar_color: string
  pin_hash: string
  created_at: string
  last_seen: string
}

export interface Room {
  id: string
  name: string
  code: string
  pin_hash: string | null
  created_by: string
  created_at: string
  is_locked: boolean
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  type: 'text' | 'image' | 'file' | 'sticker' | 'voice'
  file_url?: string
  file_name?: string
  reply_to?: string
  created_at: string
  updated_at?: string
  is_deleted?: boolean
  reactions?: MessageReaction[]
  sender?: {
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
