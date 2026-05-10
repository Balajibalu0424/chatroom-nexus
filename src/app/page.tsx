"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { CreateJoinRoom } from '@/components/room/create-join-room'
import { ChatView } from '@/components/chat/chat-view'
import { SettingsPanel } from '@/components/chat/settings-panel'
import { StarredMessages } from '@/components/chat/starred-messages'
import { ChatSkeleton } from '@/components/chat/chat-skeleton'
import { AmbientStage } from '@/components/chat/ambient-stage'
import { NotificationCenter, type InAppNotification } from '@/components/chat/notification-center'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useAuthStore } from '@/lib/stores'
import type { Room } from '@/lib/types'
import type { Message } from '@/lib/types'
import { getMessagePreview, isRoomMuted, withDefaultUserSettings } from '@/lib/rich-messaging'
import { registerServiceWorker, showNotification } from '@/lib/push-notifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, MessageCircle, LogOut, Search, Settings, Users, Lock, X, Star, Sun, Moon, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function Home() {
  const { user, isAuthenticated, logout, settings: rawSettings, updateSettings } = useAuthStore()
  const settings = useMemo(() => withDefaultUserSettings(rawSettings), [rawSettings])
  const userId = user?.id
  const username = user?.username
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateJoin, setShowCreateJoin] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showStarred, setShowStarred] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({})
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const originalTitleRef = useRef('Chatroom - Private Real-Time Messaging')

  useEffect(() => {
    // Show skeleton after 100ms to avoid flash for fast loads
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      originalTitleRef.current = document.title || originalTitleRef.current
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    registerServiceWorker()
  }, [isAuthenticated])

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', settings.theme === 'dark' || (settings.theme === 'system' && prefersDark))
    root.dataset.reducedMotion = String(settings.reduced_motion)
    root.dataset.effects3d = String(settings.effects_3d && !settings.reduced_motion)
  }, [settings.theme, settings.reduced_motion, settings.effects_3d])

  useEffect(() => {
    const unreadTotal = Object.values(unreadCounts).reduce((total, count) => total + count, 0)
    document.title = unreadTotal > 0 ? `(${unreadTotal}) ${originalTitleRef.current}` : originalTitleRef.current
  }, [unreadCounts])

  const loadRooms = useCallback(async () => {
    if (!userId || !username) return
    try {
      const response = await fetch('/api/rooms/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          userId,
          username,
        }),
      })

      if (!response.ok) {
        throw new Error('Room list request failed')
      }

      const { rooms: loadedRooms = [] } = (await response.json()) as { rooms?: Room[] }
      setRooms(loadedRooms)
      setFilteredRooms(loadedRooms)
    } catch (e: any) {
      console.error('Load rooms error:', e)
      setRooms([])
      setFilteredRooms([])
    }
  }, [userId, username])

  // Load online users for each room
  const loadOnlineUsers = useCallback(async () => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: presenceData } = await supabase
        .from('presence')
        .select('room_id, user_id')
        .eq('status', 'online')

      if (presenceData) {
        const onlineMap: Record<string, string[]> = {}
        presenceData.forEach(p => {
          if (!onlineMap[p.room_id]) onlineMap[p.room_id] = []
          onlineMap[p.room_id].push(p.user_id)
        })
        setOnlineUsers(onlineMap)
      }
    } catch (e) {
      console.error('Load presence error:', e)
    }
  }, [user])

  const playNotificationSound = useCallback(() => {
    if (!settings.sound_enabled || settings.reduced_motion) return

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      const audioContext = new AudioContextClass()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(740, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(520, audioContext.currentTime + 0.16)
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.01, settings.sound_volume ?? 0.5) * 0.12, audioContext.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.error('Notification sound failed:', error)
    }
  }, [settings.reduced_motion, settings.sound_enabled, settings.sound_volume])

  const openRoomById = useCallback((roomId: string) => {
    const room = rooms.find((candidate) => candidate.id === roomId)
    if (!room) return
    setSelectedRoom(room)
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }))
    setNotifications(prev => prev.map(notification =>
      notification.roomId === roomId ? { ...notification, read: true } : notification
    ))
  }, [rooms])

  useEffect(() => {
    if (!isAuthenticated || !user) return

    let cancelled = false
    let channel: any

    loadRooms()
    loadOnlineUsers()

    // Subscribe to presence changes
    const setupPresence = async () => {
      const { supabase } = await import('@/lib/supabase')
      await Promise.all(supabase
        .getChannels()
        .filter((existingChannel: any) => existingChannel.topic === 'realtime:global-presence')
        .map((existingChannel: any) => supabase.removeChannel(existingChannel)))

      if (cancelled) return

      channel = supabase.channel('global-presence')
      channel.on('presence', { event: 'sync' }, () => {
        loadOnlineUsers()
      })
      channel.subscribe()
    }

    setupPresence()

    return () => {
      cancelled = true
      if (channel) channel.unsubscribe()
    }
  }, [isAuthenticated, user, loadRooms, loadOnlineUsers])

  useEffect(() => {
    if (!isAuthenticated || !user || rooms.length === 0) return

    let channel: any
    const roomMap = new Map(rooms.map((room) => [room.id, room]))
    const roomIds = new Set(roomMap.keys())

    const setupRoomNotifications = async () => {
      const { supabase } = await import('@/lib/supabase')
      channel = supabase
        .channel(`room-notifications:${user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const incoming = payload.new as Message
            if (!roomIds.has(incoming.room_id) || incoming.user_id === user.id) return

            const targetRoom = roomMap.get(incoming.room_id)
            if (!targetRoom || isRoomMuted(settings, targetRoom.id)) return

            const activeVisibleRoom = selectedRoom?.id === incoming.room_id && document.visibilityState === 'visible'
            if (activeVisibleRoom) return

            const { data: sender } = await supabase
              .from('users')
              .select('username')
              .eq('id', incoming.user_id)
              .maybeSingle()

            const senderName = sender?.username ?? 'Someone'
            const preview = getMessagePreview(incoming, settings)
            const notification: InAppNotification = {
              id: incoming.id,
              roomId: incoming.room_id,
              roomName: targetRoom.name,
              title: targetRoom.name,
              body: `${senderName}: ${preview}`,
              createdAt: incoming.created_at,
              read: false,
            }

            setUnreadCounts(prev => ({
              ...prev,
              [incoming.room_id]: (prev[incoming.room_id] ?? 0) + 1,
            }))
            setNotifications(prev => [notification, ...prev.filter(item => item.id !== incoming.id)].slice(0, 30))
            setRooms(prev => prev.map(room =>
              room.id === incoming.room_id
                ? { ...room, last_message: incoming, last_message_at: incoming.created_at }
                : room
            ))

            if (settings.notifications) {
              toast(notification.body, {
                description: `New message in ${targetRoom.name}`,
                action: {
                  label: 'Open',
                  onClick: () => openRoomById(incoming.room_id),
                },
              })
            }

            playNotificationSound()

            if (document.visibilityState !== 'visible') {
              showNotification(`New message in ${targetRoom.name}`, {
                body: settings.message_preview && settings.privacy_mode !== 'private'
                  ? `${senderName}: ${preview}`
                  : `${senderName} sent a message`,
                tag: `room-${incoming.room_id}`,
                data: {
                  roomId: incoming.room_id,
                  messageId: incoming.id,
                },
              })
            }
          }
        )
        .subscribe()
    }

    setupRoomNotifications()
    return () => {
      if (channel) channel.unsubscribe()
    }
  }, [
    isAuthenticated,
    openRoomById,
    playNotificationSound,
    rooms,
    selectedRoom?.id,
    settings,
    user,
  ])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setFilteredRooms(rooms.filter(r => 
        r.name.toLowerCase().includes(query) || 
        r.code.toLowerCase().includes(query)
      ))
    } else {
      setFilteredRooms(rooms)
    }
  }, [searchQuery, rooms])

  useEffect(() => {
    if (rooms.length === 0 || selectedRoom) return
    const roomId = new URLSearchParams(window.location.search).get('room')
    if (roomId) {
      openRoomById(roomId)
    }
  }, [openRoomById, rooms.length, selectedRoom])

  const handleLogout = () => {
    logout()
    setRooms([])
    setSelectedRoom(null)
  }

  const handleRoomJoined = (room: Room) => {
    setShowCreateJoin(false)
    setSelectedRoom(room)
    // Force reload rooms list
    setTimeout(() => loadRooms(), 100)
  }

  const handleBack = () => {
    setSelectedRoom(null)
    // Force reload rooms list to show latest message
    setTimeout(() => loadRooms(), 100)
  }

  const selectedRoomId = selectedRoom?.id
  const handleSelectedRoomUnreadChange = useCallback((count: number) => {
    if (!selectedRoomId) return
    setUnreadCounts(prev => ({ ...prev, [selectedRoomId]: count }))
  }, [selectedRoomId])

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Room code copied!')
  }

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
    updateSettings({ theme: newTheme })
    
    // Apply theme immediately
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const formatLastMessage = (room: Room) => {
    if (!room?.last_message) return 'No messages yet'
    
    const msg = room.last_message
    if (!msg?.content) return 'No messages yet'
    
    const prefix = msg.type === 'image' ? '📷 Image' :
                   msg.type === 'file' ? '📎 File' :
                   msg.type === 'sticker' ? 'Sticker' :
                   msg.type === 'gif' ? 'GIF' :
                   msg.type === 'voice' ? '🎤 Voice' :
                   String(msg.content || '').slice(0, 30)
    
    return prefix + (msg.content?.length > 30 ? '...' : '')
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="premium-chat-shell min-h-screen overflow-y-auto p-4 md:p-8">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="w-full max-w-md justify-self-center lg:justify-self-start">
            <div className="text-center mb-8 lg:text-left">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <MessageCircle className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Chatroom</h1>
              <p className="text-muted-foreground">
                Private rooms with PIN protection.
                <br />No email or password required.
              </p>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/10">
              <LoginForm onSuccess={() => {}} />
            </div>
          </div>

          <div className="space-y-5">
            <AmbientStage compact disabled={!settings.effects_3d || settings.reduced_motion} />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['01', 'Glass rooms', 'Depth, blur, and readable contrast for long chat sessions.'],
                ['02', 'Rich media', 'GIFs, stickers, reactions, replies, files, images, and voice.'],
                ['03', 'Private alerts', 'Unread badges, sound controls, and content-safe push payloads.'],
              ].map(([step, title, body]) => (
                <section key={step} className="glass-panel rounded-2xl border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-primary">{step}</p>
                  <h2 className="mt-3 font-semibold">{title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedRoom) {
    return (
      <ErrorBoundary>
        <ChatView 
          room={selectedRoom} 
          onBack={handleBack}
          unreadCount={unreadCounts[selectedRoom.id] || 0}
          onUnreadChange={handleSelectedRoomUnreadChange}
        />
      </ErrorBoundary>
    )
  }

  return (
    <div className="premium-chat-shell flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="glass-panel z-10 flex w-full flex-col border-r border-white/10 bg-sidebar/80 md:w-96">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-bold">Chatrooms</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
                {settings.theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowStarred(true)} title="Starred messages">
                <Star className="h-5 w-5" />
              </Button>
              <NotificationCenter
                notifications={notifications}
                onOpenRoom={openRoomById}
                onMarkAllRead={markAllNotificationsRead}
                onClear={clearNotifications}
              />
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="Settings">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">Logged in as: <span className="font-medium text-foreground">{user.username}</span></p>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              {rooms.length === 0 ? (
                <>
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">No rooms yet</p>
                  <Button onClick={() => setShowCreateJoin(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Room
                  </Button>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No rooms found</p>
                </>
              )}
            </div>
          ) : (
            filteredRooms.map(room => (
              <div 
                key={room.id} 
                role="button"
                tabIndex={0}
                aria-label={`Open room ${room.name}`}
                className="relative cursor-pointer border-b border-white/10 p-3 transition-all hover:bg-white/10"
                onClick={() => setSelectedRoom(room)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedRoom(room)
                  }
                }}
              >
                {/* Unread badge */}
                {unreadCounts[room.id] ? (
                  <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCounts[room.id] > 9 ? '9+' : unreadCounts[room.id]}
                  </span>
                ) : null}
                
                <div className="flex items-center gap-2 mb-1">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{room.name[0]?.toUpperCase()}</span>
                    </div>
                    {/* Online indicator */}
                    {onlineUsers[room.id]?.length > 0 && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{room.name}</p>
                    <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                      {room.is_locked && <Lock className="h-3 w-3" />}
                      {room.code}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between ml-12">
                  <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
                    {formatLastMessage(room)}
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {room.last_message_at ? formatTime(room.last_message_at) : ''}
                  </span>
                </div>
                
                <div className="flex items-center justify-between ml-12 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {onlineUsers[room.id]?.length || 0} online
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyRoomCode(room.code)
                    }}
                  >
                    Share
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <Button onClick={() => setShowCreateJoin(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="hidden flex-1 items-center justify-center bg-muted/20 p-8 md:flex">
        <div className="grid w-full max-w-5xl grid-cols-[1fr_1.1fr] items-center gap-8">
          <div className="max-w-md">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Premium Chat
            </div>
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-3 text-3xl font-semibold tracking-tight">Welcome back, {user.username}!</h2>
            <p className="mb-6 text-muted-foreground">
              Select a room from the sidebar to start chatting, or create a new glassy room with GIFs, stickers,
              reactions, and private notifications.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setShowCreateJoin(true)} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Create New Room
              </Button>
            </div>
          </div>
          <AmbientStage disabled={!settings.effects_3d || settings.reduced_motion} />
        </div>
      </div>

      <CreateJoinRoom
        open={showCreateJoin}
        onOpenChange={setShowCreateJoin}
        onRoomJoined={handleRoomJoined}
      />

      {showSettings && (
        <SettingsPanel 
          open={showSettings} 
          onOpenChange={setShowSettings} 
          onLogout={handleLogout}
        />
      )}

      {showStarred && (
        <StarredMessages
          open={showStarred}
          onOpenChange={setShowStarred}
        />
      )}
    </div>
  )
}
