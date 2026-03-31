"use client"

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { formatMessageTime, getInitials } from '@/lib/utils'
import { Copy, Check, MoreHorizontal, Trash2, Edit2, Reply, Smile, Heart } from 'lucide-react'
import type { Message } from '@/lib/types'
import { useAuthStore } from '@/lib/stores'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isGrouped: boolean
  onEdit: () => void
  onDelete: () => void
  onReply: () => void
  onCopy: () => void
  onReactionUpdate?: () => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function MessageBubble({
  message,
  isOwn,
  isGrouped,
  onEdit,
  onDelete,
  onReply,
  onCopy,
  onReactionUpdate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const user = useAuthStore((state) => state.user)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReaction = async (emoji: string) => {
    if (!user) return
    
    try {
      // Check if user already reacted with this emoji
      const existing = message.reactions?.find(
        r => r.user_id === user.id && r.emoji === emoji
      )

      if (existing) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id)
      } else {
        // Add reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: message.id,
            user_id: user.id,
            emoji,
          })
      }
      
      setShowReactionPicker(false)
      onReactionUpdate?.()
    } catch (error) {
      console.error('Reaction error:', error)
      toast.error('Failed to add reaction')
    }
  }

  const handleDeleteMessage = async () => {
    if (!confirm('Delete this message?')) return
    onDelete()
  }

  // Group reactions by emoji and count
  const groupedReactions = message.reactions?.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = []
    acc[r.emoji].push(r)
    return acc
  }, {} as Record<string, typeof message.reactions>) || {}

  if (message.type === 'sticker') {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}>
        <div className={`max-w-[200px] ${isOwn ? 'order-2' : ''}`}>
          <img 
            src={message.content} 
            alt="Sticker" 
            className="max-w-full rounded-xl"
          />
          {!isGrouped && (
            <p className="text-xs text-muted-foreground mt-1 ml-1">
              {message.sender?.username}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (message.type === 'image') {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}>
        <div className={`max-w-[280px] ${isOwn ? 'order-2' : ''}`}>
          {!isGrouped && (
            <div className="flex items-center gap-2 mb-1 ml-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback 
                  style={{ backgroundColor: message.sender?.avatar_color }}
                  className="text-xs"
                >
                  {getInitials(message.sender?.username || '?')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{message.sender?.username}</span>
            </div>
          )}
          <div className="relative group">
            <img 
              src={message.file_url || message.content} 
              alt={message.file_name || 'Image'} 
              className="max-w-full rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <span className="text-white text-sm">{message.file_name}</span>
            </div>
          </div>
          
          {/* Image message reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-muted hover:bg-muted/80 transition-colors flex items-center gap-0.5"
                >
                  {emoji} <span>{reactions.length}</span>
                </button>
              ))}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mt-1 ml-1">
            {formatMessageTime(message.created_at)}
            {message.updated_at && ' (edited)'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-4'} group relative`}
    >
      {!isOwn && !isGrouped && (
        <Avatar className="h-8 w-8 mr-2 shrink-0">
          <AvatarFallback 
            style={{ backgroundColor: message.sender?.avatar_color }}
          >
            {getInitials(message.sender?.username || '?')}
          </AvatarFallback>
        </Avatar>
      )}
      
      {isOwn && !isGrouped && <div className="w-10 shrink-0" />}

      <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
        {!isGrouped && !isOwn && (
          <p className="text-sm font-medium mb-1 ml-1">{message.sender?.username}</p>
        )}
        
        <div className={`relative ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-2xl px-4 py-2.5 ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
          {message.reply_to && (
            <div className={`text-xs mb-1.5 pb-1.5 border-b ${isOwn ? 'border-primary-foreground/20' : 'border-border'} opacity-80`}>
              <Reply className="h-3 w-3 inline mr-1" />
              Reply
            </div>
          )}
          
          <p className="break-words whitespace-pre-wrap text-[15px]">
            {message.is_deleted ? (
              <span className="italic opacity-60">This message was deleted</span>
            ) : (
              message.content
            )}
          </p>
          
          {/* Reactions bar */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition-colors ${
                    isOwn 
                      ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' 
                      : 'bg-background/80 hover:bg-background'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px]">{reactions.length}</span>
                </button>
              ))}
              
              {/* Add reaction button */}
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className={`text-xs px-1.5 py-0.5 rounded-full ${isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background'} transition-colors`}
              >
                +
              </button>
            </div>
          )}

          {/* Hover action bar */}
          {!message.is_deleted && (
            <div className={`absolute -top-3 ${isOwn ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity`}>
              <div className={`flex items-center gap-0.5 bg-popover border rounded-full shadow-md p-0.5`}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={onReply}
                >
                  <Reply className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                {isOwn && (
                  <>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={onEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 rounded-full text-destructive hover:text-destructive"
                      onClick={handleDeleteMessage}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reaction picker popup */}
        {showReactionPicker && (
          <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            <div className="bg-popover border rounded-full px-2 py-1 shadow-md flex gap-0.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="hover:bg-muted rounded-full p-1 transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[11px] text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
          {message.updated_at && (
            <span className="text-[11px] text-muted-foreground">(edited)</span>
          )}
        </div>
      </div>
    </div>
  )
}
