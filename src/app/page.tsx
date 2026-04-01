"use client"

import { useState, useEffect } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { CreateJoinRoom } from '@/components/room/create-join-room'
import { useAuthStore } from '@/lib/stores'
import type { Room } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Plus, MessageCircle, LogOut } from 'lucide-react'

export default function Home() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateJoin, setShowCreateJoin] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleLogout = () => {
    logout()
    setRooms([])
  }

  const loadRooms = async () => {
    if (!user) return
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('room_members')
        .select('room:rooms(*)')
        .eq('user_id', user.id)

      if (data) {
        setRooms(data.map((m: any) => m.room).filter(Boolean))
      }
    } catch (e: any) {
      console.error('Load rooms error:', e)
    }
  }

  const handleRoomJoined = (room: Room) => {
    setShowCreateJoin(false)
    setSelectedRoom(room)
    loadRooms()
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      loadRooms()
    }
  }, [isAuthenticated, user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-sidebar flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-bold">Chatrooms</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm mt-2">Logged in as: {user.username}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              No rooms yet. Create one!
            </p>
          ) : (
            rooms.map(room => (
              <div key={room.id} className="p-3 hover:bg-muted/50 rounded-lg cursor-pointer">
                <p className="font-medium">{room.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{room.code}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Welcome, {user.username}!</h2>
          <p className="text-muted-foreground mb-4">
            Create or join a room to start chatting
          </p>
          <Button onClick={() => setShowCreateJoin(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
        </div>
      </div>

      <CreateJoinRoom
        open={showCreateJoin}
        onOpenChange={setShowCreateJoin}
        onRoomJoined={handleRoomJoined}
      />
    </div>
  )
}
