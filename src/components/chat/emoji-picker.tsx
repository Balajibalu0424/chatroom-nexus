"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import dynamic from 'next/dynamic'

const Picker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="bg-popover border rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-medium">Emoji</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Picker
        onEmojiClick={(emojiData) => {
          onSelect(emojiData.emoji)
        }}
        height={350}
        width={320}
        reactionsDefaultOpen={false}
        searchDisabled
        skinTonesDisabled
      />
    </div>
  )
}
