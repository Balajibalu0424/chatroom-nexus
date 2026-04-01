import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Room, Message, UserSettings } from '@/lib/types'
import { generateAvatarColor, verifyPin, hashPin } from '@/lib/utils'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  settings: UserSettings
  pushSubscription: any
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  checkSession: () => Promise<void>
  updateLastSeen: () => Promise<void>
  updateSettings: (settings: Partial<UserSettings>) => void
  updateProfile: (updates: Partial<User>) => Promise<void>
  subscribePush: () => Promise<void>
  unsubscribePush: () => Promise<void>
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  notifications: true,
  sound_enabled: true,
  message_preview: true,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      settings: defaultSettings,
      pushSubscription: null,

      login: async (username: string, pin: string) => {
        set({ isLoading: true })
        try {
          const { supabase } = await import('@/lib/supabase')
          
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single()

          if (fetchError) {
            console.error('Login fetch error:', fetchError)
            set({ isLoading: false })
            if (fetchError.code === 'PGRST116') {
              return { success: false, error: 'User not found. Please create an account.' }
            }
            return { success: false, error: 'Failed to find user' }
          }

          if (!existingUser) {
            set({ isLoading: false })
            return { success: false, error: 'User not found. Please create an account.' }
          }

          const isValidPin = await verifyPin(pin, existingUser.pin_hash)
          if (!isValidPin) {
            set({ isLoading: false })
            return { success: false, error: 'Incorrect PIN' }
          }

          await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', existingUser.id)

          set({ user: existingUser as User, isAuthenticated: true, isLoading: false })
          return { success: true }
        } catch (error: any) {
          console.error('Login error:', error)
          set({ isLoading: false })
          return { success: false, error: 'An error occurred during login' }
        }
      },

      register: async (username: string, pin: string) => {
        set({ isLoading: true })
        try {
          const { supabase } = await import('@/lib/supabase')
          
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single()

          if (existingUser) {
            set({ isLoading: false })
            return { success: false, error: 'Username already taken' }
          }

          const pinHash = await hashPin(pin)
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
            set({ isLoading: false })
            return { success: false, error: 'Failed to create account' }
          }

          set({ user: newUser as User, isAuthenticated: true, isLoading: false })
          return { success: true }
        } catch (error) {
          console.error('Registration error:', error)
          set({ isLoading: false })
          return { success: false, error: 'An error occurred during registration' }
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, isLoading: false })
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
          } else {
            set({ user: null, isAuthenticated: false })
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

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }))
      },

      updateProfile: async (updates) => {
        const { user } = get()
        if (!user) return

        try {
          const { supabase } = await import('@/lib/supabase')
          const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single()

          if (!error && data) {
            set({ user: data as User })
          }
        } catch (error) {
          console.error('Update profile error:', error)
        }
      },

      subscribePush: async () => {
        const { user } = get()
        if (!user) return

        try {
          const { subscribeToPush } = await import('@/lib/push-notifications')
          const { supabase } = await import('@/lib/supabase')
          const subscription = await subscribeToPush(user.id, supabase)
          set({ pushSubscription: subscription })
        } catch (error) {
          console.error('Subscribe push error:', error)
        }
      },

      unsubscribePush: async () => {
        const { user } = get()
        if (!user) return

        try {
          const { unsubscribeFromPush } = await import('@/lib/push-notifications')
          const { supabase } = await import('@/lib/supabase')
          await unsubscribeFromPush(user.id, supabase)
          set({ pushSubscription: null })
        } catch (error) {
          console.error('Unsubscribe push error:', error)
        }
      },
    }),
    {
      name: 'chatroom-auth',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
      }),
    }
  )
)

interface RoomState {
  currentRoom: Room | null
  rooms: Room[]
  messages: Map<string, Message[]>
  typingUsers: Map<string, { userId: string; username: string }[]>
  starredMessages: Message[]
  setCurrentRoom: (room: Room | null) => void
  addRoom: (room: Room) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  addMessage: (roomId: string, message: Message) => void
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void
  deleteMessage: (roomId: string, messageId: string) => void
  setMessages: (roomId: string, messages: Message[]) => void
  setTypingUsers: (roomId: string, users: { userId: string; username: string }[]) => void
  addStarredMessage: (message: Message) => void
  removeStarredMessage: (messageId: string) => void
  clearRoom: () => void
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  rooms: [],
  messages: new Map(),
  typingUsers: new Map(),
  starredMessages: [],

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
    
    // Update last message preview in room
    const updatedRooms = state.rooms.map(r => 
      r.id === roomId 
        ? { ...r, last_message: message, last_message_at: message.created_at }
        : r
    )
    
    return { messages: newMessages, rooms: updatedRooms }
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

  addStarredMessage: (message) => set((state) => ({
    starredMessages: [...state.starredMessages.filter(m => m.id !== message.id), message]
  })),

  removeStarredMessage: (messageId) => set((state) => ({
    starredMessages: state.starredMessages.filter(m => m.id !== messageId)
  })),

  clearRoom: () => set({ currentRoom: null, messages: new Map(), typingUsers: new Map() }),
}))
