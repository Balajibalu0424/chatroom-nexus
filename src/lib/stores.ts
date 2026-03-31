import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Room, Message } from '@/lib/types'
import { generateAvatarColor, verifyPin, hashPin } from '@/lib/utils'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  checkSession: () => Promise<void>
  updateLastSeen: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (username: string, pin: string) => {
        try {
          const { supabase } = await import('@/lib/supabase')
          
          // Find user by username
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single()

          if (fetchError || !existingUser) {
            return { success: false, error: 'User not found. Please create an account.' }
          }

          // Verify PIN
          if (!verifyPin(pin, existingUser.pin_hash)) {
            return { success: false, error: 'Incorrect PIN' }
          }

          // Update last seen
          await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', existingUser.id)

          set({ user: existingUser as User, isAuthenticated: true })
          return { success: true }
        } catch (error) {
          console.error('Login error:', error)
          return { success: false, error: 'An error occurred during login' }
        }
      },

      register: async (username: string, pin: string) => {
        try {
          const { supabase } = await import('@/lib/supabase')
          
          // Check if username exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single()

          if (existingUser) {
            return { success: false, error: 'Username already taken' }
          }

          // Create new user
          const pinHash = hashPin(pin)
          const avatarColor = generateAvatarColor()
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              username,
              pin_hash: pinHash,
              avatar_color: avatarColor,
              last_seen: new Date().toISOString(),
            })
            .select()
            .single()

          if (createError) {
            return { success: false, error: 'Failed to create account' }
          }

          set({ user: newUser as User, isAuthenticated: true })
          return { success: true }
        } catch (error) {
          console.error('Registration error:', error)
          return { success: false, error: 'An error occurred during registration' }
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      },

      checkSession: async () => {
        const { user } = get()
        if (!user) return

        try {
          const { supabase } = await import('@/lib/supabase')
          const { data: freshUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          if (freshUser) {
            set({ user: freshUser as User })
          }
        } catch (error) {
          console.error('Session check error:', error)
        }
      },

      updateLastSeen: async () => {
        const { user } = get()
        if (!user) return

        try {
          const { supabase } = await import('@/lib/supabase')
          await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', user.id)
        } catch (error) {
          console.error('Update last seen error:', error)
        }
      },
    }),
    {
      name: 'chatroom-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

interface RoomState {
  currentRoom: Room | null
  rooms: Room[]
  messages: Map<string, Message[]>
  typingUsers: Map<string, { userId: string; username: string }[]>
  setCurrentRoom: (room: Room | null) => void
  addRoom: (room: Room) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  addMessage: (roomId: string, message: Message) => void
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void
  deleteMessage: (roomId: string, messageId: string) => void
  setMessages: (roomId: string, messages: Message[]) => void
  setTypingUsers: (roomId: string, users: { userId: string; username: string }[]) => void
  clearRoom: () => void
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  rooms: [],
  messages: new Map(),
  typingUsers: new Map(),

  setCurrentRoom: (room) => set({ currentRoom: room }),

  addRoom: (room) => set((state) => ({
    rooms: [...state.rooms.filter(r => r.id !== room.id), room]
  })),

  updateRoom: (roomId, updates) => set((state) => ({
    rooms: state.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r),
    currentRoom: state.currentRoom?.id === roomId 
      ? { ...state.currentRoom, ...updates } 
      : state.currentRoom
  })),

  addMessage: (roomId, message) => set((state) => {
    const roomMessages = state.messages.get(roomId) || []
    const newMessages = new Map(state.messages)
    newMessages.set(roomId, [...roomMessages, message])
    return { messages: newMessages }
  }),

  updateMessage: (roomId, messageId, updates) => set((state) => {
    const roomMessages = state.messages.get(roomId) || []
    const newMessages = new Map(state.messages)
    newMessages.set(roomId, roomMessages.map(m => 
      m.id === messageId ? { ...m, ...updates } : m
    ))
    return { messages: newMessages }
  }),

  deleteMessage: (roomId, messageId) => set((state) => {
    const roomMessages = state.messages.get(roomId) || []
    const newMessages = new Map(state.messages)
    newMessages.set(roomId, roomMessages.map(m => 
      m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m
    ))
    return { messages: newMessages }
  }),

  setMessages: (roomId, messages) => set((state) => {
    const newMessages = new Map(state.messages)
    newMessages.set(roomId, messages)
    return { messages: newMessages }
  }),

  setTypingUsers: (roomId, users) => set((state) => {
    const newTyping = new Map(state.typingUsers)
    newTyping.set(roomId, users)
    return { typingUsers: newTyping }
  }),

  clearRoom: () => set({ currentRoom: null, messages: new Map(), typingUsers: new Map() }),
}))
