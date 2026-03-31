"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { EmojiPicker } from '@/components/chat/emoji-picker'
import { StickerPicker } from '@/components/chat/sticker-picker'
import { MessageBubble } from '@/components/chat/message-bubble'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import { ImageUpload } from '@/components/chat/image-upload'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores'
import { formatMessageDate, shouldShowDateDivider, getInitials } from '@/lib/utils'
import { format } from 'date-fns'
import type { Message, Room, TypingStatus } from '@/lib/types'
import { 
  Send, 
  Image, 
  Smile, 
  MoreVertical, 
  ArrowLeft,
  Lock,
  Users,
  Copy,
  Trash2,
  Edit2,
  Sticker,
  FileText,
  X,
  Check,
  CheckCheck
} from 'lucide-react'

interface ChatViewProps {
  room: Room
  onBack: () => void
}

export function ChatView({ room, onBack }: ChatViewProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [copiedCode, setCopiedCode] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const user = useAuthStore((state) => state.user)

  // Load messages with reactions
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true)
      
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(username, avatar_color),
          reactions:message_reactions(*, user:users(username))
        `)
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (data) {
        setMessages(data as Message[])
      }
      
      setIsLoading(false)
    }

    loadMessages()
  }, [room.id])

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`*, sender:users(username, avatar_color), reactions:message_reactions(*, user:users(username))`)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === data.id)) return prev
              return [...prev, data as Message]
            })
            
            if (!isAtBottom) {
              setUnreadCount((prev) => prev + 1)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id ? { ...m, ...payload.new } : m
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        async (payload) => {
          // Fetch the full reaction with user info
          const { data } = await supabase
            .from('message_reactions')
            .select(`*, user:users(username)`)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === payload.new.message_id) {
                  const existing = m.reactions || []
                  if (existing.some((r: any) => r.id === data.id)) return m
                  return { ...m, reactions: [...existing, data] }
                }
                return m
              })
            )
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === payload.old.message_id) {
                return {
                  ...m,
                  reactions: (m.reactions || []).filter((r: any) => r.id !== payload.old.id)
                }
              }
              return m
            })
          )
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const typing = payload.payload as TypingStatus
        if (typing.user_id !== user?.id) {
          setTypingUsers((prev) => {
            const filtered = prev.filter((t) => t.user_id !== typing.user_id)
            if (typing.is_typing) {
              return [...filtered, typing]
            }
            return filtered
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room.id, user?.id, isAtBottom])

  // Auto-scroll
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [messages])

  useEffect(() => {
    if (isAtBottom) {
      setUnreadCount(0)
    }
  }, [isAtBottom])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const atBottom = scrollHeight - scrollTop - clientHeight < 100
      setIsAtBottom(atBottom)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() && !editingMessage) return
    
    try {
      if (editingMessage) {
        const { error } = await supabase
          .from('messages')
          .update({ 
            content: message.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMessage.id)
          .eq('user_id', user!.id)

        if (!error) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === editingMessage.id
                ? { ...m, content: message.trim(), updated_at: new Date().toISOString() }
                : m
            )
          )
        }
        
        setEditingMessage(null)
      } else {
        const { data } = await supabase
          .from('messages')
          .insert({
            room_id: room.id,
            user_id: user!.id,
            content: message.trim(),
            type: 'text',
            reply_to: replyTo?.id || null,
          })
          .select(`*, sender:users(username, avatar_color), reactions:message_reactions(*, user:users(username))`)
          .single()

        if (data) {
          setMessages((prev) => [...prev, data as Message])
        }
      }
      
      setMessage('')
      setReplyTo(null)
      sendTypingStatus(false)
      inputRef.current?.focus()
    } catch (error) {
      console.error('Send message error:', error)
    }
  }

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (!user) return
    
    supabase.channel(`room:${room.id}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        room_id: room.id,
        user_id: user.id,
        username: user.username,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      },
    })
  }, [room.id, user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    sendTypingStatus(true)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false)
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const handleStickerSelect = async (stickerUrl: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .insert({
          room_id: room.id,
          user_id: user!.id,
          content: stickerUrl,
          type: 'sticker',
        })
        .select(`*, sender:users(username, avatar_color), reactions:message_reactions(*, user:users(username))`)
        .single()

      if (data) {
        setMessages((prev) => [...prev, data as Message])
      }
      
      setShowStickerPicker(false)
    } catch (error) {
      console.error('Send sticker error:', error)
    }
  }

  const handleImageUpload = async (url: string, fileName: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .insert({
          room_id: room.id,
          user_id: user!.id,
          content: url,
          type: 'image',
          file_url: url,
          file_name: fileName,
          reply_to: replyTo?.id || null,
        })
        .select(`*, sender:users(username, avatar_color), reactions:message_reactions(*, user:users(username))`)
        .single()

      if (data) {
        setMessages((prev) => [...prev, data as Message])
      }
      
      setShowImageUpload(false)
      setReplyTo(null)
    } catch (error) {
      console.error('Send image error:', error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('user_id', user!.id)

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m
        )
      )
    } catch (error) {
      console.error('Delete message error:', error)
    }
  }

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message)
    setMessage(message.content)
    inputRef.current?.focus()
  }

  const handleReply = (message: Message) => {
    setReplyTo(message)
    inputRef.current?.focus()
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const copyMessageContent = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleReactionUpdate = async (messageId: string) => {
    const { data } = await supabase
      .from('message_reactions')
      .select(`*, user:users(username)`)
      .eq('message_id', messageId)
    
    if (data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: data } : m
        )
      )
    }
  }

  const cancelEdit = () => {
    setEditingMessage(null)
    setMessage('')
  }

  const otherTypingUsers = typingUsers.filter((t) => t.is_typing && t.user_id !== user?.id)

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background relative">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 lg:p-4 border-b bg-background shrink-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback 
              style={{ backgroundColor: room.is_locked ? '#ef4444' : '#22c55e' }}
              className="text-white font-medium"
            >
              {room.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{room.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {room.is_locked ? (
                <Lock className="h-3 w-3 shrink-0" />
              ) : (
                <Users className="h-3 w-3 shrink-0" />
              )}
              <span className="font-mono">{room.code}</span>
              <button
                onClick={handleCopyCode}
                className="hover:text-foreground transition-colors p-0.5"
              >
                {copiedCode ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyCode}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Room Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Leave Room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <ScrollArea 
          ref={messagesContainerRef}
          className="flex-1"
          onScroll={handleScroll}
        >
          <div className="p-4 space-y-4 min-h-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium mb-1">No messages yet</p>
                <p className="text-sm text-muted-foreground">Send the first message to start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const prevMsg = index > 0 ? messages[index - 1] : null
                  const showDateDivider = shouldShowDateDivider(messages, index)
                  const isOwn = msg.user_id === user?.id
                  const isGrouped = prevMsg && 
                    prevMsg.user_id === msg.user_id && 
                    new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000

                  return (
                    <div key={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center gap-4 my-4">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                            {formatMessageDate(msg.created_at)}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      
                      <MessageBubble
                        message={msg}
                        isOwn={isOwn}
                        isGrouped={!!isGrouped}
                        onEdit={() => handleEditMessage(msg)}
                        onDelete={() => handleDeleteMessage(msg.id)}
                        onReply={() => handleReply(msg)}
                        onCopy={() => copyMessageContent(msg.content)}
                        onReactionUpdate={() => handleReactionUpdate(msg.id)}
                      />
                    </div>
                  )
                })}
                
                {otherTypingUsers.length > 0 && (
                  <TypingIndicator users={otherTypingUsers.map((t) => t.username)} />
                )}
              </>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Unread badge */}
        {!isAtBottom && unreadCount > 0 && (
          <button
            onClick={() => {
              scrollToBottom()
              setIsAtBottom(true)
            }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce z-10 flex items-center gap-2"
          >
            <ChevronDown className="h-4 w-4" />
            {unreadCount} new message{unreadCount > 1 ? 's' : ''}
          </button>
        )}

        {/* Reply preview */}
        {replyTo && (
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center gap-3 shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-medium">Replying to {replyTo.sender?.username}</p>
              <p className="text-sm text-muted-foreground truncate">{replyTo.content}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setReplyTo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Edit indicator */}
        {editingMessage && (
          <div className="px-4 py-2 bg-primary/10 border-t flex items-center gap-3 shrink-0">
            <Edit2 className="h-4 w-4 text-primary" />
            <span className="text-sm flex-1 text-primary font-medium">Editing message</span>
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        )}

        {/* Input area */}
        <div className="p-3 lg:p-4 border-t bg-background shrink-0">
          <div className="flex items-end gap-2">
            {/* Left tools */}
            <div className="flex gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowImageUpload(!showImageUpload)}
                    className="h-10 w-10"
                  >
                    <Image className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Photo</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowStickerPicker(!showStickerPicker)}
                    className="h-10 w-10"
                  >
                    <Sticker className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stickers</TooltipContent>
              </Tooltip>
            </div>

            {/* Main input */}
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Message..."
                className="pr-16 h-11"
              />
              
              <div className="absolute right-1.5 bottom-1.5 flex gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-8 w-8"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Send button */}
            <Button 
              onClick={sendMessage}
              disabled={!message.trim()}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {/* Tooltip popups */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-4 lg:right-auto lg:left-4 mb-2 z-20">
              <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
            </div>
          )}

          {showStickerPicker && (
            <div className="absolute bottom-full right-4 mb-2 z-20">
              <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowStickerPicker(false)} />
            </div>
          )}

          {showImageUpload && (
            <div className="absolute bottom-full right-4 mb-2 z-20">
              <ImageUpload 
                onUpload={handleImageUpload} 
                onClose={() => setShowImageUpload(false)} 
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}
