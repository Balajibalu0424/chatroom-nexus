"use client"

import { useState, useEffect, useCallback } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { CreateJoinRoom } from '@/components/room/create-join-room'
import { ChatView } from '@/components/chat/chat-view'
import { SettingsPanel } from '@/components/chat/settings-panel'
import { useAuthStore } from '@/lib/stores'
import type { Room } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, MessageCircle, LogOut, Search, Settings, Users, Lock, X } from 'lucide-react'
import { toast } from 'sonner'

export default function Home() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateJoin, setShowCreateJoin] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const loadRooms = useCallback(async () => {
    if (!user) return
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('room_members')
        .select('room:rooms(*)')
        .eq('user_id', user.id)

      if (data) {
        const loadedRooms = data.map((m: any) => m.room).filter(Boolean) as Room[]
        setRooms(loadedRooms)
        setFilteredRooms(loadedRooms)
      }
    } catch (e: any) {
      console.error('Load rooms error:', e)
    }
  }, [user])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadRooms()
    }
  }, [isAuthenticated, user, loadRooms])

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
      <ChatView 
        room={selectedRoom} 
        onBack={handleBack}
        unreadCount={unreadCounts[selectedRoom.id] || 0}
        onUnreadChange={(count) => setUnreadCounts(prev => ({ ...prev, [selectedRoom.id]: count }))}
      />
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
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
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
                {unreadCounts[room.id] ? (
                  <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCounts[room.id] > 9 ? '9+' : unreadCounts[room.id]}
                  </span>
                ) : null}
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">{room.name}</p>
                  {room.is_locked && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-mono">{room.code}</p>
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
    </div>
  )
}
