import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(length = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function hashPin(pin: string): string {
  // Simple hash for demo - in production use proper bcrypt/argon2
  // This creates a deterministic hash based on the pin
  let hash = 0
  const str = pin + 'chatroom_salt_2024'
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash
}

export function generateAvatarColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF6347',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export function formatMessageTime(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) {
    return format(d, 'HH:mm')
  }
  if (isYesterday(d)) {
    return 'Yesterday ' + format(d, 'HH:mm')
  }
  return format(d, 'dd/MM/yy HH:mm')
}

export function formatMessageDate(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) {
    return 'Today'
  }
  if (isYesterday(d)) {
    return 'Yesterday'
  }
  return format(d, 'MMMM dd, yyyy')
}

export function shouldShowDateDivider(messages: Message[], index: number): boolean {
  if (index === 0) return true
  const current = new Date(messages[index].created_at).toDateString()
  const previous = new Date(messages[index - 1].created_at).toDateString()
  return current !== previous
}

export function areMessagesGrouped(message: Message, previousMessage: Message | null): boolean {
  if (!previousMessage) return false
  if (message.user_id !== previousMessage.user_id) return false
  const timeDiff = new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()
  return timeDiff < 60000 // 1 minute
}
