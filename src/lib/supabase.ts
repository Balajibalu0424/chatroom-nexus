import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please add them to .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'chatroom-auth',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          pin_hash: string
          avatar_color: string
          created_at: string
          last_seen: string
        }
        Insert: {
          id?: string
          username: string
          pin_hash: string
          avatar_color?: string
          created_at?: string
          last_seen?: string
        }
        Update: {
          id?: string
          username?: string
          pin_hash?: string
          avatar_color?: string
          created_at?: string
          last_seen?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          code: string
          pin_hash: string | null
          created_by: string
          created_at: string
          is_locked: boolean
        }
        Insert: {
          id?: string
          name: string
          code: string
          pin_hash?: string | null
          created_by: string
          created_at?: string
          is_locked?: boolean
        }
        Update: {
          id?: string
          name?: string
          code?: string
          pin_hash?: string | null
          created_by?: string
          created_at?: string
          is_locked?: boolean
        }
      }
      room_members: {
        Row: {
          id: string
          room_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          content: string
          type: 'text' | 'image' | 'file' | 'sticker' | 'voice'
          file_url: string | null
          file_name: string | null
          reply_to: string | null
          is_deleted: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          content: string
          type?: 'text' | 'image' | 'file' | 'sticker' | 'voice'
          file_url?: string | null
          file_name?: string | null
          reply_to?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          content?: string
          type?: 'text' | 'image' | 'file' | 'sticker' | 'voice'
          file_url?: string | null
          file_name?: string | null
          reply_to?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
      typing_status: {
        Row: {
          id: string
          room_id: string
          user_id: string
          username: string
          is_typing: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          username: string
          is_typing?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          username?: string
          is_typing?: boolean
          updated_at?: string
        }
      }
    }
  }
}
