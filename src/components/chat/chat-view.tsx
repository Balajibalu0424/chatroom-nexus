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
import { FileUpload } from '@/components/chat/file-upload'
import { VoiceRecorder } from '@/components/chat/voice-recorder'
import { SearchMessages } from '@/components/chat/search-messages'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores'
import { formatMessageDate, shouldShowDateDivider, getInitials } from '@/lib/utils'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import type { Message, Room, TypingStatus, PresenceState } from '@/lib/types'
import { toast } from 'sonner'
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
  CheckCheck,
  Search,
  Mic,
  MoreHorizontal,
  Phone,
  Video,
  Info,
  ChevronDown,
  Quote,
  Star,
  Forward,
  Crown,
  Shield,
  Ban
} from 'lucide-react'

interface ChatViewProps {
  room: Room
  onBack: () => void
  unreadCount?: number
  onUnreadChange?: (count: number) => void
}

export function ChatView({ room, onBack, unreadCount = 0, onUnreadChange }: ChatViewProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [searchHighlighted, setSearchHighlighted] = useState<number>(-1)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardMessage, setForwardMessage] = useState<string | null>(null)
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [bannedUsers, setBannedUsers] = useState<string[]>([])
  
  // Pagination state
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null)
  const MESSAGES_PER_PAGE = 50
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const user = useAuthStore((state) => state.user)

  // Load messages with reactions (with pagination)
  const loadMessages = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:users(id, username, avatar_color),
          reactions:message_reactions(*, user:users(id, username))
        `)
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })
        .limit(MESSAGES_PER_PAGE)

      // If loading more, get messages older than the oldest one
      if (loadMore && oldestMessageId) {
        const { data: oldestMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', oldestMessageId)
          .single()
        
        if (oldestMsg) {
          query = query.lt('created_at', oldestMsg.created_at)
        }
      }

      const { data } = await query

      if (data) {
        if (loadMore) {
          setMessages(prev => [...data as Message[], ...prev])
          if (data.length < MESSAGES_PER_PAGE) {
            setHasMore(false)
          }
          if (data.length > 0) {
            setOldestMessageId(data[0].id)
          }
        } else {
          setMessages(data as Message[])
          if (data.length > 0) {
            setOldestMessageId(data[data.length - 1].id)
          }
          if (data.length < MESSAGES_PER_PAGE) {
            setHasMore(false)
          }
        }
      }
    } catch (e) {
      console.error('Load messages error:', e)
    }
    setIsLoading(false)
    setIsLoadingMore(false)
  }, [room.id, oldestMessageId, MESSAGES_PER_PAGE])

  // Load more when scrolling up
  const loadMoreMessages = useCallback(() => {
    if (!isLoadingMore && hasMore && !isAtBottom) {
      loadMessages(true)
    }
  }, [isLoadingMore, hasMore, isAtBottom, loadMessages])

  // Load room members and check admin status
  const loadMembers = async () => {
    if (!user || !room) return
    
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('room_members')
        .select('*, user:users(id, username, avatar_color, last_seen)')
        .eq('room_id', room.id)

      if (data) {
        setMembers(data)
      }

      // Check if user is admin
      const { data: adminData } = await supabase
        .from('room_admins')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single()

      setIsAdmin(!!adminData)

      // Load banned users
      const { data: bans } = await supabase
        .from('room_bans')
        .select('user_id')
        .eq('room_id', room.id)

      if (bans) {
        setBannedUsers(bans.map((b: any) => b.user_id))
      }
    } catch (e) {
      console.error('Load members error:', e)
    }
  }

  useEffect(() => {
    loadMessages()
    loadMembers()
  }, [loadMessages, room.id])

  // Subscribe to realtime changes
  useEffect(() => {
    let channel: any

    const setupRealtime = async () => {
      const { supabase } = await import('@/lib/supabase')
      
      channel = supabase
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
            // Fetch full message with sender and reactions
            const { data: fullMessage } = await supabase
              .from('messages')
              .select(`*, sender:users(id, username, avatar_color), reactions:message_reactions(*, user:users(id, username))`)
              .eq('id', payload.new.id)
              .single()
            
            if (fullMessage) {
              setMessages(prev => [...prev, fullMessage as Message])
              
              // Update unread if not at bottom
              if (!isAtBottom && fullMessage.user_id !== user?.id) {
                onUnreadChange?.((unreadCount || 0) + 1)
              }
              
              // Scroll to bottom if at bottom
              if (isAtBottom) {
                scrollToBottom()
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
            const updatedMessage = payload.new as Message
            setMessages(prev => 
              prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m)
            )
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${room.id}`,
          },
          (payload) => {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id))
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions',
          },
          () => {
            // Reload reactions for all messages
            loadMessages()
          }
        )
        .subscribe()

      // Presence channel
      const presenceChannel = supabase.channel(`presence:${room.id}`)
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState()
          const users = Object.values(state).flat() as any[]
          setOnlineUsers(users.map(u => u.user_id))
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && user) {
            await presenceChannel.track({
              user_id: user.id,
              username: user.username,
              avatar_color: user.avatar_color,
              online_at: new Date().toISOString(),
            })
          }
        })

      // Typing indicator channel
      const typingChannel = supabase.channel(`typing:${room.id}`)
      typingChannel
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.user_id !== user?.id) {
            setTypingUsers(prev => {
              const filtered = prev.filter(t => t.user_id !== payload.user_id)
              if (payload.is_typing) {
                return [...filtered, payload]
              }
              return filtered
            })
          }
        })
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [room.id, user, isAtBottom, unreadCount, onUnreadChange, loadMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [messages, isAtBottom])

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsAtBottom(atBottom)
    if (atBottom) {
      onUnreadChange?.(0)
    }
    
    // Load more when scrolling near top
    if (scrollTop < 200 && hasMore && !isLoadingMore) {
      loadMoreMessages()
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() && !editingMessage) return
    if (!user) return

    const trimmedMessage = message.trim()
    if (!trimmedMessage && !editingMessage) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      if (editingMessage) {
        // Update existing message
        const { error } = await supabase
          .from('messages')
          .update({ 
            content: trimmedMessage, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', editingMessage.id)
          .eq('user_id', user.id)

        if (!error) {
          setMessages(prev => prev.map(m => 
            m.id === editingMessage.id 
              ? { ...m, content: trimmedMessage, updated_at: new Date().toISOString() }
              : m
          ))
        }
        setEditingMessage(null)
      } else {
        // Optimistic UI
        const tempId = `temp-${Date.now()}`
        const optimisticMessage: Message = {
          id: tempId,
          room_id: room.id,
          user_id: user.id,
          content: trimmedMessage,
          type: 'text',
          created_at: new Date().toISOString(),
          sender: { username: user.username, avatar_color: user.avatar_color },
          status: 'sending' as const,
          reply_to: replyTo?.id || undefined,
        }
        
        setMessages(prev => [...prev, optimisticMessage])
        setReplyTo(null)
        scrollToBottom()

        // Send to server
        const { data, error } = await supabase
          .from('messages')
          .insert({
            room_id: room.id,
            user_id: user.id,
            content: trimmedMessage,
            type: 'text',
            reply_to: replyTo?.id || null,
          })
          .select(`*, sender:users(id, username, avatar_color), reactions:message_reactions(*, user:users(id, username))`)
          .single()

        if (!error && data) {
          // Replace optimistic message with real one
          setMessages(prev => prev.map(m => m.id === tempId ? data as Message : m))
        } else {
          // Remove optimistic message on error
          setMessages(prev => prev.filter(m => m.id !== tempId))
          toast.error('Failed to send message')
        }
      }

      setMessage('')
    } catch (e) {
      console.error('Send message error:', e)
      toast.error('Failed to send message')
    }
  }

  const handleSendImage = async (url: string, fileName: string) => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: room.id,
          user_id: user.id,
          content: fileName,
          type: 'image',
          file_url: url,
          file_name: fileName,
          reply_to: replyTo?.id || null,
        })
        .select(`*, sender:users(id, username, avatar_color), reactions:message_reactions(*, user:users(id, username))`)
        .single()

      if (!error && data) {
        setMessages(prev => [...prev, data as Message])
        scrollToBottom()
      }
      
      setShowImageUpload(false)
      setReplyTo(null)
    } catch (e) {
      console.error('Send image error:', e)
      toast.error('Failed to send image')
    }
  }

  const handleSendFile = async (url: string, fileName: string, fileType: string, fileSize: number) => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: room.id,
          user_id: user.id,
          content: fileName,
          type: 'file',
          file_url: url,
          file_name: fileName,
          reply_to: replyTo?.id || null,
        })
        .select(`*, sender:users(id, username, avatar_color), reactions:message_reactions(*, user:users(id, username))`)
        .single()

      if (!error && data) {
        setMessages(prev => [...prev, data as Message])
        scrollToBottom()
      }
      
      setShowFileUpload(false)
      setReplyTo(null)
    } catch (e) {
      console.error('Send file error:', e)
      toast.error('Failed to send file')
    }
  }

  const handleSendVoice = async (url: string, duration: number) => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: room.id,
          user_id: user.id,
          content: `Voice message (${Math.round(duration)}s)`,
          type: 'voice',
          file_url: url,
          reply_to: replyTo?.id || null,
        })
        .select(`*, sender:users(id, username, avatar_color), reactions:message_reactions(*, user:users(id, username))`)
        .single()

      if (!error && data) {
        setMessages(prev => [...prev, data as Message])
        scrollToBottom()
      }
      
      setShowVoiceRecorder(false)
      setReplyTo(null)
    } catch (e) {
      console.error('Send voice error:', e)
      toast.error('Failed to send voice message')
    }
  }

  const handleSendSticker = async (url: string, stickerName: string) => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: room.id,
          user_id: user.id,
          content: stickerName,
          type: 'sticker',
          file_url: url,
        })
        .select(`*, sender:users(id, username, avatar_color), reactions:message_reactions(*, user:users(id, username))`)
        .single()

      if (!error && data) {
        setMessages(prev => [...prev, data as Message])
        scrollToBottom()
      }
      
      setShowStickerPicker(false)
    } catch (e) {
      console.error('Send sticker error:', e)
      toast.error('Failed to send sticker')
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase
        .from('messages')
        .update({ is_deleted: true, content: 'This message was deleted' })
        .eq('id', messageId)
        .eq('user_id', user!.id)

      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, is_deleted: true, content: 'This message was deleted' }
          : m
      ))
      toast.success('Message deleted')
    } catch (e) {
      console.error('Delete message error:', e)
      toast.error('Failed to delete message')
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single()

      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id)
      } else {
        await supabase.from('message_reactions').insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        })
      }
      
      loadMessages()
    } catch (e) {
      console.error('Reaction error:', e)
    }
  }

  const handleStarMessage = async (messageId: string, isStarred: boolean) => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      await supabase
        .from('messages')
        .update({ is_starred: !isStarred })
        .eq('id', messageId)

      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, is_starred: !isStarred } : m
      ))
      
      toast.success(isStarred ? 'Removed from starred' : 'Added to starred')
    } catch (e) {
      console.error('Star error:', e)
      toast.error('Failed to star message')
    }
  }

  const handleForwardMessage = async (messageId: string) => {
    setForwardMessage(messageId)
    setShowForwardModal(true)
  }

  const handleCopyLink = async (messageId: string) => {
    const link = `${window.location.origin}/chat/${room.id}?msg=${messageId}`
    await navigator.clipboard.writeText(link)
    toast.success('Message link copied!')
  }

  const handleKickUser = async (memberId: string, memberName: string) => {
    if (!user || !isAdmin) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Remove from room
      await supabase
        .from('room_members')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', memberId)

      toast.success(`${memberName} has been removed from the room`)
      loadMembers()
    } catch (e) {
      console.error('Kick error:', e)
      toast.error('Failed to remove user')
    }
  }

  const handleBanUser = async (memberId: string, memberName: string) => {
    if (!user || !isAdmin) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      // Remove from room
      await supabase
        .from('room_members')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', memberId)

      // Add to banned list
      await supabase
        .from('room_bans')
        .upsert({
          room_id: room.id,
          user_id: memberId,
          banned_by: user.id,
          reason: 'Kicked by admin',
        })

      toast.success(`${memberName} has been banned from the room`)
      loadMembers()
    } catch (e) {
      console.error('Ban error:', e)
      toast.error('Failed to ban user')
    }
  }

  const handleMakeAdmin = async (memberId: string, memberName: string) => {
    if (!user || !isAdmin) return

    try {
      const { supabase } = await import('@/lib/supabase')
      
      await supabase
        .from('room_admins')
        .upsert({
          room_id: room.id,
          user_id: memberId,
          role: 'admin',
        })

      toast.success(`${memberName} is now an admin`)
      loadMembers()
    } catch (e) {
      console.error('Make admin error:', e)
      toast.error('Failed to make admin')
    }
  }

  const handleTyping = async (isTyping: boolean) => {
    if (!user) return

    try {
      const { supabase } = await import('@/lib/supabase')
      const channel = supabase.channel(`typing:${room.id}`)
      
      channel.send({
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
    } catch (e) {
      console.error('Typing error:', e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length > 2000) return // Max 2000 chars
    setMessage(value)
    
    // Send typing indicator
    handleTyping(true)
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false)
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code)
    setCopiedCode(true)
    toast.success('Room code copied!')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = messages.filter(m => 
        m.content.toLowerCase().includes(query.toLowerCase())
      )
      setSearchResults(results)
      setSearchHighlighted(-1)
    } else {
      setSearchResults([])
    }
  }

  const scrollToSearchResult = (index: number) => {
    setSearchHighlighted(index)
    // Find message in DOM and scroll to it
    const messageElements = messagesContainerRef.current?.querySelectorAll('[data-message-id]')
    if (messageElements && messageElements[index]) {
      messageElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ''

  messages.forEach((msg, idx) => {
    const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd')
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groupedMessages.push({ date: msgDate, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  })

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-16 border-b bg-background flex items-center px-4 gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => setShowMembers(true)}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">{room.name[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold">{room.name}</p>
            <p className="text-xs text-muted-foreground">
              {onlineUsers.length} online • {room.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowMembers(true)}>
            <Users className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyRoomCode}>
                <Copy className="h-4 w-4 mr-2" />
                {copiedCode ? 'Copied!' : 'Copy Room Code'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowMembers(true)}>
                <Users className="h-4 w-4 mr-2" />
                View Members
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="border-b p-3 bg-muted/30">
          <SearchMessages 
            onSearch={handleSearch}
            results={searchResults}
            onResultClick={(idx) => scrollToSearchResult(idx)}
            highlighted={searchHighlighted}
          />
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea 
        className="flex-1" 
        ref={messagesContainerRef as any}
        onScroll={handleScroll}
      >
        <div className="p-4 space-y-4">
          {/* Load more indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          {/* No more messages indicator */}
          {!hasMore && messages.length > 0 && (
            <div className="flex items-center justify-center py-2">
              <span className="text-xs text-muted-foreground">Beginning of conversation</span>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-1">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Start the conversation by sending a message!
              </p>
            </div>
          ) : (
            groupedMessages.map((group, groupIdx) => (
              <div key={group.date}>
                <div className="flex items-center justify-center my-4">
                  <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                    {formatMessageDate(group.date)}
                  </span>
                </div>
                
                {group.messages.map((msg, msgIdx) => {
                  const prevMsg = groupIdx === 0 && msgIdx === 0 
                    ? null 
                    : groupIdx === 0 
                      ? group.messages[msgIdx - 1]
                      : groupedMessages[groupIdx - 1].messages[groupedMessages[groupIdx - 1].messages.length - 1]
                  
                  const showDateDivider = msgIdx === 0
                  const isGrouped = prevMsg && 
                    prevMsg.user_id === msg.user_id &&
                    new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000

                  return (
                    <div key={msg.id} data-message-id={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-4">
                          <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                            {formatMessageDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <MessageBubble
                        message={msg}
                        isOwn={msg.user_id === user?.id}
                        isGrouped={!!isGrouped}
                        onReply={() => setReplyTo(msg)}
                        onEdit={() => {
                          setEditingMessage(msg)
                          setMessage(msg.content)
                        }}
                        onDelete={() => handleDeleteMessage(msg.id)}
                        onReaction={(emoji) => handleReaction(msg.id, emoji)}
                        onStar={() => handleStarMessage(msg.id, !!msg.is_starred)}
                        onForward={() => handleForwardMessage(msg.id)}
                        onCopyLink={() => handleCopyLink(msg.id)}
                        searchQuery={searchQuery}
                        isHighlighted={searchResults[searchHighlighted]?.id === msg.id}
                      />
                    </div>
                  )
                })}
              </div>
            ))
          )}
          
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TypingIndicator users={typingUsers.map(t => t.username)} />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Jump to bottom button */}
      {!isAtBottom && (
        <Button 
          className="absolute bottom-24 right-8 rounded-full shadow-lg"
          size="icon"
          onClick={() => {
            scrollToBottom()
            onUnreadChange?.(0)
          }}
        >
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <div className="border-t bg-muted/30 px-4 py-2 flex items-center gap-2">
          <Quote className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate flex-1">
            Reply to {replyTo.sender?.username}: {replyTo.content.slice(0, 50)}...
          </span>
          <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Composer */}
      <div className="border-t bg-background p-3">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowImageUpload(true)}>
                    <Image className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send Image</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowFileUpload(true)}>
                    <FileText className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send File</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowVoiceRecorder(true)}>
                    <Mic className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voice Message</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="mb-2">
                <EmojiPicker onSelect={(emoji) => {
                  setMessage(prev => prev + emoji)
                  inputRef.current?.focus()
                }} />
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={showStickerPicker} onOpenChange={setShowStickerPicker}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Sticker className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="mb-2">
                <StickerPicker onSelect={handleSendSticker} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 relative">
            {editingMessage && (
              <div className="absolute -top-8 left-0 right-0 bg-muted rounded-t-lg px-3 py-1 flex items-center justify-between">
                <span className="text-xs">Editing message</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                  setEditingMessage(null)
                  setMessage('')
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={editingMessage ? "Edit message..." : "Type a message..."}
              className="pr-20"
            />
          </div>

          {message.trim() || editingMessage ? (
            <Button size="icon" onClick={handleSendMessage}>
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="icon" variant="secondary">
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Modals */}
      {showImageUpload && (
        <ImageUpload 
          open={showImageUpload} 
          onOpenChange={setShowImageUpload}
          onUpload={handleSendImage}
        />
      )}

      {showFileUpload && (
        <FileUpload
          open={showFileUpload}
          onOpenChange={setShowFileUpload}
          onUpload={handleSendFile}
        />
      )}

      {showVoiceRecorder && (
        <VoiceRecorder
          open={showVoiceRecorder}
          onOpenChange={setShowVoiceRecorder}
          onSend={handleSendVoice}
        />
      )}

      {/* Members Panel */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMembers(false)} />
          <div className="relative w-80 bg-background h-full shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Members ({members.length})</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMembers(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {members.map(member => {
                const isOnline = onlineUsers.includes(member.user?.id)
                const isSelf = member.user_id === user?.id
                const isMemberAdmin = member.role === 'admin' || isAdmin && member.user_id === user?.id
                
                return (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: member.user?.avatar_color }}>
                          {getInitials(member.user?.username || '?')}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{member.user?.username}</p>
                        {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    
                    {/* Admin controls */}
                    {isAdmin && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!member.role && (
                            <DropdownMenuItem onClick={() => handleMakeAdmin(member.user_id, member.user?.username)}>
                              <Crown className="h-4 w-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleKickUser(member.user_id, member.user?.username)}
                            className="text-destructive"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleBanUser(member.user_id, member.user?.username)}
                            className="text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Ban
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageCircle(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
