"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { EmojiPicker } from '@/components/chat/emoji-picker'
import { StickerPicker } from '@/components/chat/sticker-picker'
import { MessageBubble } from '@/components/chat/message-bubble'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import { ImageUpload } from '@/components/chat/image-upload'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useRoomStore } from '@/lib/stores'
import { formatMessageDate, shouldShowDateDivider } from '@/lib/utils'
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
  Mic
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const user = useAuthStore((state) => state.user)
  const updateMessage = useRoomStore((state) => state.updateMessage)
  const deleteMessage = useRoomStore((state) => state.deleteMessage)

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true)
      
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(username, avatar_color)
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

  // Subscribe to new messages
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
          // Fetch full message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`*, sender:users(username, avatar_color)`)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            setMessages((prev) => [...prev, data as Message])
            
            // Update unread count if scrolled up
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
          if (payload.new.is_deleted) {
            deleteMessage(room.id, payload.new.id)
          } else {
            updateMessage(room.id, payload.new.id, payload.new)
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id ? { ...m, ...payload.new } : m
            )
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
  }, [room.id, user?.id, isAtBottom, updateMessage, deleteMessage])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [messages])

  // Clear unread count when scrolling to bottom
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
        // Update message
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
        // Send new message
        const { data } = await supabase
          .from('messages')
          .insert({
            room_id: room.id,
            user_id: user!.id,
            content: message.trim(),
            type: 'text',
            reply_to: replyTo?.id || null,
          })
          .select(`*, sender:users(username, avatar_color)`)
          .single()

        if (data) {
          setMessages((prev) => [...prev, data as Message])
        }
      }
      
      setMessage('')
      setReplyTo(null)
      sendTypingStatus(false)
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
    
    // Send typing status
    sendTypingStatus(true)
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing
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
        .select(`*, sender:users(username, avatar_color)`)
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
        .select(`*, sender:users(username, avatar_color)`)
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
  }

  const handleReply = (message: Message) => {
    setReplyTo(message)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code)
  }

  const copyMessageContent = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const otherTypingUsers = typingUsers.filter((t) => t.is_typing && t.user_id !== user?.id)

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Avatar className="h-10 w-10">
            <AvatarFallback style={{ backgroundColor: room.is_locked ? '#ef4444' : '#22c55e' }}>
              {room.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{room.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {room.is_locked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Users className="h-3 w-3" />
              )}
              <span>Code: {room.code}</span>
              <button
                onClick={handleCopyCode}
                className="hover:text-foreground transition-colors"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
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
          className="flex-1 p-4"
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="text-6xl mb-4">💬</div>
              <p>No messages yet</p>
              <p className="text-sm">Send the first message!</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                        <span className="text-xs text-muted-foreground">
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
                    />
                  </div>
                )
              })}
              
              {otherTypingUsers.length > 0 && (
                <TypingIndicator users={otherTypingUsers.map((t) => t.username)} />
              )}
            </div>
            
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Unread indicator */}
        {!isAtBottom && unreadCount > 0 && (
          <button
            onClick={() => {
              scrollToBottom()
              setIsAtBottom(true)
              setUnreadCount(0)
            }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce"
          >
            {unreadCount} new message{unreadCount > 1 ? 's' : ''}
          </button>
        )}

        {/* Reply preview */}
        {replyTo && (
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Replying to {replyTo.sender?.username}</p>
              <p className="text-sm truncate">{replyTo.content}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}>
              ×
            </Button>
          </div>
        )}

        {/* Edit indicator */}
        {editingMessage && (
          <div className="px-4 py-2 bg-primary/10 border-t flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            <span className="text-sm flex-1">Editing message</span>
            <Button variant="ghost" size="sm" onClick={() => {
              setEditingMessage(null)
              setMessage('')
            }}>
              Cancel
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-end gap-2">
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowImageUpload(!showImageUpload)}
                    >
                      <Image className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send Image</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowStickerPicker(!showStickerPicker)}
                    >
                      <Sticker className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stickers</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex-1 relative">
                <Input
                  value={message}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="pr-20"
                />
                
                <div className="absolute right-2 bottom-1 flex gap-1">
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
            </div>

            <Button 
              onClick={sendMessage}
              disabled={!message.trim()}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {/* Emoji picker popup */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-4 mb-2">
              <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
            </div>
          )}

          {/* Sticker picker popup */}
          {showStickerPicker && (
            <div className="absolute bottom-full right-4 mb-2">
              <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowStickerPicker(false)} />
            </div>
          )}

          {/* Image upload popup */}
          {showImageUpload && (
            <div className="absolute bottom-full right-4 mb-2">
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
