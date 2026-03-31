"use client"

import { useState, useEffect } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { CreateJoinRoom } from '@/components/room/create-join-room'
import { ChatView } from '@/components/chat/chat-view'
import { useAuthStore } from '@/lib/stores'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import type { Room } from '@/lib/types'
import { Plus, Search, Settings, LogOut, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function Home() {
  const [currentView, setCurrentView] = useState<'landing' | 'rooms' | 'chat'>('landing')
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreateJoin, setShowCreateJoin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { user, isAuthenticated, logout } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      setCurrentView('rooms')
      loadRooms()
    }
  }, [isAuthenticated, user])

  const loadRooms = async () => {
    if (!user) return

    const { data } = await supabase
      .from('room_members')
      .select(`
        room:rooms(
          *,
          last_message:messages(content, created_at, type)
        )
      `)
      .eq('user_id', user.id)

    if (data) {
      const userRooms = data
        .map((m: any) => m.room as Room)
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
    setCurrentView('chat')
    setShowCreateJoin(false)
    loadRooms() // Refresh room list
  }

  const handleBackToRooms = () => {
    setCurrentRoom(null)
    setCurrentView('rooms')
    loadRooms() // Refresh to get any new messages
  }

  const handleLogout = () => {
    logout()
    setCurrentView('landing')
    setRooms([])
  }

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Chatroom</h1>
            <p className="text-muted-foreground">
              Private rooms with PIN protection. No signup required.
            </p>
          </div>
          
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <LoginForm onSuccess={() => setCurrentView('rooms')} />
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'chat' && currentRoom) {
    return (
      <div className="h-screen flex flex-col">
        <ChatView room={currentRoom} onBack={handleBackToRooms} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback style={{ backgroundColor: user.avatar_color }}>
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">{user.username}</h1>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Settings className="h-5 w-5" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Search and Actions */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowCreateJoin(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Room
          </Button>
        </div>

        {/* Rooms List */}
        {filteredRooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery ? 'No rooms found' : 'No rooms yet'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? 'Try a different search term'
                : 'Create your first room or join an existing one'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateJoin(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Your Rooms ({filteredRooms.length})
            </h2>
            
            <ScrollArea className="h-[calc(100vh-220px)]">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomJoined(room)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback 
                      style={{ backgroundColor: room.is_locked ? '#ef4444' : '#22c55e' }}
                      className="text-lg"
                    >
                      {room.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{room.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {room.last_message 
                          ? new Date(room.last_message.created_at).toLocaleDateString()
                          : new Date(room.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {room.is_locked ? (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                          Private
                        </span>
                      ) : (
                        <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                          Public
                        </span>
                      )}
                      <span className="font-mono text-xs">{room.code}</span>
                    </div>
                    {room.last_message && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {room.last_message.type === 'image' ? '📷 Image' :
                         room.last_message.type === 'sticker' ? '🖼️ Sticker' :
                         room.last_message.content}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        )}
      </main>

      {/* Create/Join Dialog */}
      <CreateJoinRoom 
        open={showCreateJoin} 
        onOpenChange={setShowCreateJoin}
        onRoomJoined={handleRoomJoined}
      />
    </div>
  )
}
