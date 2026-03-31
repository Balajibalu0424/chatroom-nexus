"use client"

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface TypingIndicatorProps {
  users: string[]
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  const text = users.length === 1 
    ? `${users[0]} is typing`
    : users.length === 2
    ? `${users[0]} and ${users[1]} are typing`
    : `${users[0]} and ${users.length - 1} others are typing`

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
      <div className="flex gap-1">
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full" />
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full" />
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full" />
      </div>
      <span>{text}</span>
    </div>
  )
}
