"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { generateRoomCode, hashPin, verifyPin } from '@/lib/utils'
import type { Room } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2, Lock, Users, Shield } from 'lucide-react'
import { useAuthStore } from '@/lib/stores'

interface CreateJoinRoomProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoomJoined: (room: Room) => void
}

export function CreateJoinRoom({ open, onOpenChange, onRoomJoined }: CreateJoinRoomProps) {
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice')
  const [roomName, setRoomName] = useState('')
  const [roomPin, setRoomPin] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPin, setJoinPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const user = useAuthStore((state) => state.user)

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('Room name is required')
      return
    }
    
    if (roomPin && (roomPin.length < 4 || roomPin.length > 6)) {
      toast.error('Room PIN must be 4-6 digits if set')
      return
    }

    setIsLoading(true)
    
    try {
      const roomCode = generateRoomCode()
      const pinHash = roomPin ? await hashPin(roomPin) : null
      
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          name: roomName.trim(),
          code: roomCode,
          pin_hash: pinHash,
          created_by: user!.id,
          is_locked: !!pinHash,
        })
        .select()
        .single()

      if (error) throw error

      // Auto-join the room as a member
      await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user!.id,
        })

      toast.success(`Room "${room.name}" created! Code: ${roomCode}`)
      onRoomJoined(room as Room)
    } catch (error) {
      console.error('Create room error:', error)
      toast.error('Failed to create room')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      toast.error('Room code is required')
      return
    }

    setIsLoading(true)
    
    try {
      // Find room by code
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', joinCode.toUpperCase())
        .single()

      if (fetchError || !room) {
        toast.error('Room not found. Check the code and try again.')
        setIsLoading(false)
        return
      }

      // Check if room is locked
      if (room.is_locked) {
        if (!joinPin) {
          toast.error('This room is PIN protected. Enter the room PIN.')
          setIsLoading(false)
          return
        }
        
        const isValidPin = await verifyPin(joinPin, room.pin_hash)
        if (!isValidPin) {
          toast.error('Incorrect room PIN')
          setIsLoading(false)
          return
        }
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user!.id)
        .single()

      if (!existingMember) {
        // Join the room
        const { error: joinError } = await supabase
          .from('room_members')
          .insert({
            room_id: room.id,
            user_id: user!.id,
          })

        if (joinError) throw joinError
      }

      toast.success(`Joined "${room.name}"!`)
      onRoomJoined(room as Room)
    } catch (error) {
      console.error('Join room error:', error)
      toast.error('Failed to join room')
    } finally {
      setIsLoading(false)
    }
  }

  const resetAndClose = () => {
    setMode('choice')
    setRoomName('')
    setRoomPin('')
    setJoinCode('')
    setJoinPin('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'choice' ? 'Create or Join a Room' : 
             mode === 'create' ? 'Create a Room' : 'Join a Room'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'choice' 
              ? 'Create a new chatroom or join an existing one with a code'
              : mode === 'create'
              ? 'Set up your new chatroom'
              : 'Enter the 6-character room code to join'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'choice' && (
          <div className="grid gap-4 py-4">
            <Button onClick={() => setMode('create')} className="h-20 text-lg">
              <div className="flex flex-col items-center gap-2">
                <Users className="h-8 w-8" />
                Create Room
              </div>
            </Button>
            <Button onClick={() => setMode('join')} variant="outline" className="h-20 text-lg">
              <div className="flex flex-col items-center gap-2">
                <Lock className="h-8 w-8" />
                Join Room
              </div>
            </Button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                placeholder="e.g., Friends, Family, Team"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={30}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="roomPin">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Room PIN (Optional)
                </div>
              </Label>
              <Input
                id="roomPin"
                type="password"
                placeholder="4-6 digit PIN to lock room"
                value={roomPin}
                onChange={(e) => setRoomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for public room, set a PIN for private room
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode('choice')}>
                Back
              </Button>
              <Button onClick={handleCreateRoom} disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Room
              </Button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode">Room Code</Label>
              <Input
                id="joinCode"
                placeholder="Enter 6-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="joinPin">Room PIN (if required)</Label>
              <Input
                id="joinPin"
                type="password"
                placeholder="Enter PIN if room is locked"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode('choice')}>
                Back
              </Button>
              <Button onClick={handleJoinRoom} disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Join Room
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
