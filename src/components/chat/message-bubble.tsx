"use client"

import { useState, useMemo } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { EmojiPicker } from '@/components/chat/emoji-picker'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { getInitials } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { 
  MoreVertical, 
  Reply, 
  Copy, 
  Trash2, 
  Edit2,
  Check,
  CheckCheck,
  Smile,
  Star,
  Forward
} from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isGrouped: boolean
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
  onReaction: (emoji: string) => void
  onStar?: () => void
  onForward?: () => void
  onCopyLink?: () => void
  searchQuery?: string
  isHighlighted?: boolean
}

export function MessageBubble({ 
  message, 
  isOwn, 
  isGrouped, 
  onReply, 
  onEdit, 
  onDelete,
  onReaction,
  onStar,
  onForward,
  onCopyLink,
  searchQuery = '',
  isHighlighted = false
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false)

  // Group reactions by emoji
  const groupedReactions = useMemo(() => {
    if (!message.reactions?.length) return []
    
    const groups: { [key: string]: { count: number; users: string[]; hasReacted: boolean } } = {}
    
    message.reactions.forEach(r => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = { count: 0, users: [], hasReacted: false }
      }
      groups[r.emoji].count++
      if (r.user?.username) {
        groups[r.emoji].users.push(r.user.username)
      }
    })
    
    return Object.entries(groups).map(([emoji, data]) => ({
      emoji,
      ...data
    }))
  }, [message.reactions])

  const highlightText = (text: string) => {
    if (!searchQuery) return text
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'))
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500/50 rounded px-0.5">{part}</mark>
      ) : part
    )
  }

  const copyMessage = () => {
    navigator.clipboard.writeText(message.content)
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusIcon = () => {
    if (!isOwn) return null
    
    switch (message.status) {
      case 'sending':
        return <span className="text-muted-foreground text-xs">Sending...</span>
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />
      case 'seen':
        return <CheckCheck className="h-3 w-3 text-primary" />
      default:
        return null
    }
  }

  const renderContent = () => {
    if (message.is_deleted) {
      return (
        <p className="italic text-muted-foreground text-sm">
          {message.content}
        </p>
      )
    }

    switch (message.type) {
      case 'image':
        return (
          <div className="space-y-2">
            <img 
              src={message.file_url || ''} 
              alt={message.file_name || 'Image'}
              className="max-w-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => message.file_url && window.open(message.file_url, '_blank')}
            />
            {message.content && (
              <p className="text-sm">{highlightText(message.content)}</p>
            )}
          </div>
        )
      
      case 'file':
        return (
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {message.file_name?.split('.').pop()?.toUpperCase() || 'FILE'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">{message.file_name || 'File'}</p>
              <p className="text-xs text-muted-foreground">Click to download</p>
            </div>
          </div>
        )
      
      case 'voice':
        return (
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 min-w-[200px]">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
              <Play className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full w-1/3" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{message.content}</span>
          </div>
        )
      
      case 'sticker':
        return (
          <img 
            src={message.file_url || ''} 
            alt={message.content}
            className="w-24 h-24 object-contain"
          />
        )
      
      default:
        return (
          <p className="text-sm break-words">
            {highlightText(message.content)}
          </p>
        )
    }
  }

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡']

  return (
    <div className={`flex group ${isOwn ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}>
      {!isOwn && !isGrouped && (
        <Avatar className="h-8 w-8 mr-2 mt-auto">
          <AvatarFallback 
            style={{ backgroundColor: message.sender?.avatar_color || '#4ECDC4' }}
            className="text-xs"
          >
            {getInitials(message.sender?.username || '?')}
          </AvatarFallback>
        </Avatar>
      )}
      
      {isGrouped && <div className="w-8 mr-2" />}

      <div 
        className={`max-w-[70%] ${isHighlighted ? 'ring-2 ring-yellow-500 ring-offset-2 rounded-lg' : ''}`}
      >
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">
              {message.sender?.username || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
            {message.updated_at && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}
        
        <div className={`relative rounded-2xl px-4 py-2 ${
          isOwn 
            ? 'bg-primary text-primary-foreground rounded-br-md' 
            : 'bg-muted rounded-bl-md'
        }`}>
          {renderContent()}
          
          {/* Message actions - visible on hover */}
          <div className={`absolute -top-8 ${isOwn ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <div className={`flex items-center gap-1 bg-background rounded-lg shadow-lg border p-1 ${isOwn ? '' : 'flex-row-reverse'}`}>
              <TooltipProvider>
                <DropdownMenu open={showReactions} onOpenChange={setShowReactions}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="mb-2">
                    <div className="flex gap-1 p-1">
                      {quickReactions.map(emoji => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            onReaction(emoji)
                            setShowReactions(false)
                          }}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                    <EmojiPicker onSelect={(emoji) => {
                      onReaction(emoji)
                      setShowReactions(false)
                    }} />
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReply}>
                      <Reply className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reply</TooltipContent>
                </Tooltip>

                {isOwn && !message.is_deleted && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </>
                )}

                {!isOwn && !message.is_deleted && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyMessage}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy</TooltipContent>
                    </Tooltip>

                    {onStar && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStar}>
                            <Star className={`h-4 w-4 ${message.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{message.is_starred ? 'Unstar' : 'Star'}</TooltipContent>
                      </Tooltip>
                    )}

                    {onForward && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onForward}>
                            <Forward className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Forward</TooltipContent>
                      </Tooltip>
                    )}

                    {onCopyLink && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopyLink}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy Link</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Reactions */}
        {groupedReactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {groupedReactions.map(({ emoji, count, users }) => (
              <Tooltip key={emoji}>
                <TooltipTrigger asChild>
                  <button
                    className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 bg-muted hover:bg-muted/80 transition-colors ${isOwn ? '' : ''}`}
                    onClick={() => onReaction(emoji)}
                  >
                    <span>{emoji}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {users.join(', ')}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Timestamp for grouped messages */}
        {isGrouped && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
            {isOwn && getStatusIcon()}
          </div>
        )}
      </div>

      {!isOwn && !isGrouped && <div className="w-8 ml-2" />}
      
      {isOwn && !isGrouped && (
        <div className="flex items-end gap-1 ml-2">
          {getStatusIcon()}
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
        </div>
      )}
    </div>
  )
}

function Play(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
