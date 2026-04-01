"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageBubble } from '@/components/chat/message-bubble'
import { useAuthStore } from '@/lib/stores'
import { Star, X, Loader2 } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { Message } from '@/lib/types'

interface StarredMessagesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StarredMessages({ open, onOpenChange }: StarredMessagesProps) {
  const [starredMessages, setStarredMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (open && user) {
      loadStarredMessages()
    }
  }, [open, user])

  const loadStarredMessages = async () => {
    setIsLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(id, username, avatar_color),
          reactions:message_reactions(*, user:users(id, username))
        `)
        .eq('user_id', user!.id)
        .eq('is_starred', true)
        .order('created_at', { ascending: false })

      if (data) {
        setStarredMessages(data as Message[])
      }
    } catch (e) {
      console.error('Load starred messages error:', e)
    }
    setIsLoading(false)
  }

  const handleUnstar = async (messageId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase
        .from('messages')
        .update({ is_starred: false })
        .eq('id', messageId)

      setStarredMessages(prev => prev.filter(m => m.id !== messageId))
    } catch (e) {
      console.error('Unstar error:', e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Starred Messages
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : starredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium mb-1">No starred messages</p>
              <p className="text-sm text-muted-foreground">
                Long-press or hover on a message and tap the star icon to save it here
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {starredMessages.map(msg => (
                <div key={msg.id} className="relative group">
                  <MessageBubble
                    message={msg}
                    isOwn={msg.user_id === user?.id}
                    isGrouped={false}
                    onReply={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onReaction={() => {}}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleUnstar(msg.id)}
                  >
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
