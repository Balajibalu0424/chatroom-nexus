"use client"

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { formatMessageTime } from '@/lib/utils'
import { Copy, Check, MoreHorizontal, Trash2, Edit2, Reply, Smile } from 'lucide-react'
import type { Message } from '@/lib/types'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isGrouped: boolean
  onEdit: () => void
  onDelete: () => void
  onReply: () => void
  onCopy: () => void
}

export function MessageBubble({
  message,
  isOwn,
  isGrouped,
  onEdit,
  onDelete,
  onReply,
  onCopy,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏']

  if (message.type === 'sticker') {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}>
        <div className={`max-w-[200px] ${isOwn ? 'order-2' : ''}`}>
          <img 
            src={message.content} 
            alt="Sticker" 
            className="max-w-full rounded-lg"
          />
          {!isGrouped && (
            <p className="text-xs text-muted-foreground mt-1">
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
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback 
                  style={{ backgroundColor: message.sender?.avatar_color }}
                  className="text-xs"
                >
                  {message.sender?.username?.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{message.sender?.username}</span>
            </div>
          )}
          <div className="relative group">
            <img 
              src={message.file_url || message.content} 
              alt={message.file_name || 'Image'} 
              className="max-w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">{message.file_name}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatMessageTime(message.created_at)}
            {message.updated_at && ' (edited)'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-4'} group`}
    >
      {!isOwn && !isGrouped && (
        <Avatar className="h-8 w-8 mr-2">
          <AvatarFallback 
            style={{ backgroundColor: message.sender?.avatar_color }}
          >
            {message.sender?.username?.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      {isOwn && !isGrouped && <div className="w-10" />}

      <div className={`max-w-[70%] ${isOwn ? 'order-2' : ''}`}>
        {!isGrouped && !isOwn && (
          <p className="text-sm font-medium mb-1 ml-1">{message.sender?.username}</p>
        )}
        
        <div className={`relative ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-2xl px-4 py-2 ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
          {message.reply_to && (
            <div className={`text-xs mb-1 pb-1 border-b ${isOwn ? 'border-primary-foreground/20' : 'border-border'} opacity-70`}>
              Reply to a message
            </div>
          )}
          
          <p className="break-words whitespace-pre-wrap">
            {message.is_deleted ? (
              <span className="italic opacity-60">This message was deleted</span>
            ) : (
              message.content
            )}
          </p>
          
          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction) => (
                <span 
                  key={reaction.id}
                  className={`text-xs px-1.5 py-0.5 rounded-full ${isOwn ? 'bg-primary-foreground/20' : 'bg-background'}`}
                >
                  {reaction.emoji}
                </span>
              ))}
            </div>
          )}

          {/* Hover actions */}
          {!message.is_deleted && (
            <div className={`absolute ${isOwn ? '-left-12' : '-right-12'} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowReactions(!showReactions)}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={onReply}
                >
                  <Reply className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                {isOwn && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      onClick={onEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={onDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            {reactionEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setShowReactions(false)}
                className="hover:bg-muted rounded-full p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
          {message.updated_at && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>
      </div>
    </div>
  )
}
