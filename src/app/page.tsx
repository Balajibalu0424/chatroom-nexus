"use client"

import { useState, useEffect, useCallback } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { CreateJoinRoom } from '@/components/room/create-join-room'
import { ChatView } from '@/components/chat/chat-view'
import { SettingsPanel } from '@/components/chat/settings-panel'
import { StarredMessages } from '@/components/chat/starred-messages'
import { ChatSkeleton } from '@/components/chat/chat-skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useAuthStore } from '@/lib/stores'
import type { Room } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, MessageCircle, LogOut, Search, Settings, Users, Lock, X, Star, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'

export default function Home() {
  const { user, isAuthenticated, logout, settings, updateSettings } = useAuthStore()
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

  useEffect(() => {
    // Show skeleton after 100ms to avoid flash for fast loads
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const loadRooms = useCallback(async () => {
    if (!user) return
    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Load rooms with last message
      const { data } = await supabase
        .from('room_members')
        .select(`
          room:rooms(
            *,
            last_message:messages(content, created_at, type, user_id)
          )
        `)
        .eq('user_id', user.id)

      if (data && data.length > 0) {
        const loadedRooms = data
          .map((m: any) => m.room)
          .filter((room): room is Room => room && typeof room === 'object')
        
        // Sort by last message time
        loadedRooms.sort((a, b) => {
          const aTime = a.last_message_at || a.created_at
          const bTime = b.last_message_at || b.created_at
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
        setRooms(loadedRooms)
        setFilteredRooms(loadedRooms)
      } else {
        setRooms([])
        setFilteredRooms([])
      }
    } catch (e: any) {
      console.error('Load rooms error:', e)
      setRooms([])
      setFilteredRooms([])
    }
  }, [user])

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

  useEffect(() => {
    if (isAuthenticated && user) {
      loadRooms()
      loadOnlineUsers()
      
      // Subscribe to presence changes
      const setupPresence = async () => {
        const { supabase } = await import('@/lib/supabase')
        const channel = supabase.channel('global-presence')
        channel.on('presence', { event: 'sync' }, () => {
          loadOnlineUsers()
        })
        channel.subscribe()
      }
      setupPresence()
    }
  }, [isAuthenticated, user, loadRooms, loadOnlineUsers])

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

  const handleLogout = () => {
    logout()
    setRooms([])
    setSelectedRoom(null)
  }

  const handleRoomJoined = (room: Room) => {
    setShowCreateJoin(false)
    setSelectedRoom(room)
    loadRooms()
  }

  const handleBack = () => {
    setSelectedRoom(null)
    loadRooms()
  }

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

  const formatLastMessage = (room: Room) => {
    if (!room?.last_message) return 'No messages yet'
    
    const msg = room.last_message
    if (!msg?.content) return 'No messages yet'
    
    const prefix = msg.type === 'image' ? '📷 Image' :
                   msg.type === 'file' ? '📎 File' :
                   msg.type === 'sticker' ? '💬 sticker' :
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Chatroom</h1>
            <p className="text-muted-foreground">
              Private rooms with PIN protection.
              <br />No email or password required.
            </p>
          </div>
          
          <div className="bg-card rounded-2xl border p-6 shadow-lg">
            <LoginForm onSuccess={() => {}} />
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
          onUnreadChange={(count) => setUnreadCounts(prev => ({ ...prev, [selectedRoom.id]: count }))}
        />
      </ErrorBoundary>
    )
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-sidebar flex flex-col">
        <div className="p-4 border-b">
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
                className="p-3 hover:bg-muted/50 cursor-pointer border-b border-muted/20 relative"
                onClick={() => setSelectedRoom(room)}
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

        <div className="p-4 border-t">
          <Button onClick={() => setShowCreateJoin(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center max-w-md p-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome back, {user.username}!</h2>
          <p className="text-muted-foreground mb-6">
            Select a room from the sidebar to start chatting, or create a new one.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setShowCreateJoin(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create New Room
            </Button>
          </div>
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
