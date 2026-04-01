import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday } from 'date-fns'
import type { Message } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ================================================
// SECURE PIN HASHING USING WEB CRYPTO API
// ================================================

const SALT = 'chatroom_pin_salt_v1_'

// Convert string to Uint8Array
function stringToBuffer(str: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

// Convert ArrayBuffer or TypedArray to hex string
function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Hash PIN using SHA-256 with salt
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer)
  return bufferToHex(hashBuffer)
}

// Verify PIN against hash
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    const newHash = await hashPin(pin)
    return newHash === hash
  } catch (error) {
    console.error('verifyPin error:', error)
    return false
  }
}

// Synchronous hash for compatibility (uses simple hash for non-critical ops)
// NEVER use for PINs - only for non-security purposes
export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export function generateId(length = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

export function generateAvatarColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF6347',
    '#9370DB', '#20B2AA', '#FFA07A', '#7B68EE', '#00FA9A',
  ]
  const array = new Uint8Array(1)
  crypto.getRandomValues(array)
  return colors[array[0] % colors.length]
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

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return format(d, 'MMM d')
}

export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}
