"use client"

import { useState, useEffect, useCallback } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { CreateJoinRoom } from '@/components/room/create-join-room'
import { ChatView } from '@/components/chat/chat-view'
import { useAuthStore } from '@/lib/stores'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import type { Room, Message } from '@/lib/types'
import { formatRelativeTime, getInitials, generateAvatarColor } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  Plus, 
  Search, 
  Settings, 
  LogOut, 
  MessageCircle, 
  MoreVertical, 
  Lock, 
  Users,
  ChevronLeft,
  LogIn,
  Sun,
  Moon
} from 'lucide-react'

function ChatRoomItem({ 
  room, 
  isSelected, 
  onClick, 
  onDelete 
}: { 
  room: Room
  isSelected: boolean
  onClick: () => void
  onDelete?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${
        isSelected ? 'bg-muted/70' : ''
      }`}
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarFallback 
          style={{ backgroundColor: room.is_locked ? '#ef4444' : '#22c55e' }}
          className="text-base font-medium text-white"
        >
          {room.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">{room.name}</h3>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {room.last_message 
              ? formatRelativeTime(room.last_message.created_at)
              : formatRelativeTime(room.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {room.is_locked ? (
            <Lock className="h-3 w-3 shrink-0" />
          ) : (
            <Users className="h-3 w-3 shrink-0" />
          )}
          <span className="font-mono text-xs">{room.code}</span>
        </div>
        {room.last_message && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {room.last_message.type === 'image' ? '📷 Photo' :
             room.last_message.type === 'sticker' ? '🖼️ Sticker' :
             room.last_message.type === 'voice' ? '🎤 Voice message' :
             room.last_message.content}
          </p>
        )}
      </div>
    </button>
  )
}

function Sidebar({ 
  rooms, 
  selectedRoom, 
  onSelectRoom, 
  onCreateRoom,
  onLogout,
  user 
}: {
  rooms: Room[]
  selectedRoom: Room | null
  onSelectRoom: (room: Room) => void
  onCreateRoom: () => void
  onLogout: () => void
  user: { username: string; avatar_color: string } | null
}) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-sidebar border-r">
      {/* Header */}
      <div className="p-4 border-b bg-sidebar">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Chatrooms</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onCreateRoom} className="h-9 w-9">
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Room</TooltipContent>
            </Tooltip>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onLogout}
                  className="flex items-center gap-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback style={{ backgroundColor: user?.avatar_color || '#4ECDC4' }}>
              {user ? getInitials(user.username) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Room list */}
      <ScrollArea className="flex-1">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-3">
              <MessageCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">
              {searchQuery ? 'No rooms found' : 'No rooms yet'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search' : 'Create your first room'}
            </p>
            {!searchQuery && (
              <Button size="sm" onClick={onCreateRoom}>
                <Plus className="h-4 w-4 mr-1" />
                Create Room
              </Button>
            )}
          </div>
        ) : (
          <div className="py-2">
            <p className="px-4 py-1 text-xs font-medium text-muted-foreground">
              Rooms ({filteredRooms.length})
            </p>
            {filteredRooms.map((room) => (
              <ChatRoomItem
                key={room.id}
                room={room}
                isSelected={selectedRoom?.id === room.id}
                onClick={() => onSelectRoom(room)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function LandingPage({ onAuthenticated }: { onAuthenticated: () => void }) {
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
          <LoginForm onSuccess={onAuthenticated} />
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Your data is stored securely. PINs are hashed and never stored in plain text.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreateJoin, setShowCreateJoin] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [appError, setAppError] = useState<string | null>(null)
  
  const { user, isAuthenticated, logout } = useAuthStore()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Load rooms when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadRooms().catch((err: any) => {
        console.error('loadRooms error:', err)
        setAppError('Failed to load rooms: ' + err.message)
      })
    }
  }, [isAuthenticated, user])

  // Subscribe to room updates
  useEffect(() => {
    if (!user) return

    let channel: any
    try {
      channel = supabase
        .channel('rooms-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          loadRooms().catch(console.error)
        })
        .subscribe()
    } catch (err: any) {
      console.error('Channel subscription error:', err)
      setAppError('Realtime error: ' + err.message)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [user?.id])

  const loadRooms = async () => {
    if (!user) return

    const { data } = await supabase
      .from('room_members')
      .select(`
        room:rooms(
          *,
          last_message:messages(content, created_at, type, user_id)
        )
      `)
      .eq('user_id', user.id)

    if (data) {
      const userRooms = data
        .map((m: any) => {
          const room = m.room as Room
          if (room && room.last_message) {
            // Get sender info for last message
            room.last_message.sender = { username: 'You', avatar_color: '#4ECDC4' }
          }
          return room
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aTime = a.last_message?.created_at || a.created_at
          const bTime = b.last_message?.created_at || b.created_at
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
      setRooms(userRooms)
    }
  }

  const handleRoomJoined = (room: Room) => {
    setCurrentRoom(room)
    setShowCreateJoin(false)
    loadRooms()
  }

  const handleBackToList = () => {
    setCurrentRoom(null)
    loadRooms()
  }

  const handleLogout = () => {
    logout()
    setCurrentRoom(null)
    setRooms([])
  }

  // Loading state
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if any
  if (appError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 max-w-md w-full">
          <h2 className="text-destructive font-semibold mb-2">App Error</h2>
          <pre className="text-xs text-muted-foreground overflow-auto whitespace-pre-wrap">{appError}</pre>
          <Button className="mt-4 w-full" onClick={() => setAppError(null)}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <>
        <LandingPage onAuthenticated={() => {}} />
        <CreateJoinRoom 
          open={showCreateJoin} 
          onOpenChange={setShowCreateJoin}
          onRoomJoined={handleRoomJoined}
        />
      </>
    )
  }

  // Chat view
  if (currentRoom) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Mobile back button */}
        <div className="lg:hidden flex items-center gap-2 p-3 border-b bg-background">
          <Button variant="ghost" size="icon" onClick={handleBackToList}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium truncate">{currentRoom.name}</span>
        </div>
        
        <ChatView room={currentRoom} onBack={handleBackToList} />
      </div>
    )
  }

  // Room list view
  return (
    <div className="h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-80 flex-col">
        <Sidebar 
          rooms={rooms}
          selectedRoom={null}
          onSelectRoom={handleRoomJoined}
          onCreateRoom={() => setShowCreateJoin(true)}
          onLogout={handleLogout}
          user={user}
        />
      </div>

      {/* Mobile room list */}
      <div className="flex-1 flex flex-col lg:hidden">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h1 className="font-bold">Chatrooms</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowCreateJoin(true)}>
                <Plus className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Room list */}
        <main className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No rooms yet</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first chatroom or join an existing one
              </p>
              <Button onClick={() => setShowCreateJoin(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {rooms.map((room) => (
                <ChatRoomItem
                  key={room.id}
                  room={room}
                  isSelected={false}
                  onClick={() => handleRoomJoined(room)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create/Join Dialog */}
      <CreateJoinRoom 
        open={showCreateJoin} 
        onOpenChange={setShowCreateJoin}
        onRoomJoined={handleRoomJoined}
      />
    </div>
  )
}
