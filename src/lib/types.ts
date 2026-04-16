export interface User {
  id: string
  username: string
  avatar_color: string
  avatar_url?: string | null
  pin_hash: string
  bio?: string
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
  description?: string
  code: string
  pin_hash?: string | null
  created_by?: string | null
  is_locked: boolean
  created_at: string
  last_message?: Message
  last_message_at?: string
  unread_count?: number
  member_count?: number
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
  reply_to_message?: Message
  created_at: string
  updated_at?: string | null
  is_deleted?: boolean
  is_starred?: boolean
  reactions?: MessageReaction[]
  sender?: {
    id?: string
    username: string
    avatar_color: string
    avatar_url?: string
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

export interface StarredMessage {
  id: string
  message_id: string
  user_id: string
  created_at: string
  message?: Message
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  is_online?: boolean
  is_muted?: boolean
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

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  sound_enabled: boolean
  message_preview: boolean
}

export interface AdminDevice {
  id: string
  label: string
  mesh_node_id: string
  platform: 'windows' | 'macos' | 'linux' | 'other'
  sort_order: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface AdminAuditLog {
  id: string
  action: string
  device_id: string | null
  admin_username: string
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AdminAuditLogInsert {
  action: string
  device_id?: string | null
  admin_username: string
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
}
