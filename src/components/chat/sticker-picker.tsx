"use client"

import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface StickerPickerProps {
  onSelect: (stickerUrl: string) => void
  onClose: () => void
}

// Free sticker packs from imgflip
const stickerPacks = [
  {
    name: 'Classic',
    stickers: [
      'https://i.imgflip.com/1bij.jpg',  // One Does Not Simply
      'https://i.imgflip.com/1ur9b0.jpg', // Change My Mind
      'https://i.imgflip.com/30b1gx.jpg', // Leonardo Dicaprio Cheers
      'https://i.imgflip.com/1g8my4.jpg', // Awkward Look Monkey Puppet
      'https://i.imgflip.com/9ehk.jpg',   // Laughing Leo
      'https://i.imgflip.com/1h7in3.jpg', // Drake Approving
      'https://i.imgflip.com/4t0m5.jpg',  // Woman Yelling at Cat
      'https://i.imgflip.com/261o3j.jpg', // This Is Fine
    ]
  },
  {
    name: 'Reactions',
    stickers: [
      'https://i.imgflip.com/4/280.jpg',   // Thumbs Up
      'https://i.imgflip.com/2j3u1i.jpg',  // Distracted Boyfriend
      'https://i.imgflip.com/3oevdk.jpg',  // Two Buttons
      'https://i.imgflip.com/1bhw.jpg',    // Y U No
      'https://i.imgflip.com/m8j6a.jpg',   // Oppression
      'https://i.imgflip.com/3lmzyx.jpg',  // Bernie Sanders Once Again
    ]
  }
]

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  return (
    <div className="bg-popover border rounded-lg shadow-lg overflow-hidden w-80">
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-medium">Stickers</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-2 max-h-64 overflow-y-auto">
        {stickerPacks.map((pack) => (
          <div key={pack.name} className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">{pack.name}</p>
            <div className="grid grid-cols-4 gap-2">
              {pack.stickers.map((url, index) => (
                <button
                  key={index}
                  onClick={() => onSelect(url)}
                  className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                >
                  <img 
                    src={url} 
                    alt={`Sticker ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
