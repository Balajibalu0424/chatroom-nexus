"use client"

import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { stickerPacks } from '@/lib/sticker-packs'

interface StickerPickerProps {
  onSelect: (stickerUrl: string, stickerName: string) => void
  onClose?: () => void
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  return (
    <div className="glass-panel w-80 overflow-hidden rounded-2xl border border-white/15">
      <div className="flex items-center justify-between border-b border-white/10 p-3">
        <div>
          <span className="text-sm font-semibold">Stickers</span>
          <p className="text-xs text-muted-foreground">Static and animated default packs</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="max-h-72 overflow-y-auto p-3">
        {stickerPacks.map((pack) => (
          <div key={pack.id} className="mb-5 last:mb-0">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">{pack.name}</p>
            <div className="grid grid-cols-4 gap-2">
              {pack.stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => {
                    onSelect(sticker.url, sticker.name)
                    onClose?.()
                  }}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-muted transition-all hover:-translate-y-0.5 hover:ring-2 hover:ring-primary focus-visible:ring-2"
                  title={sticker.name}
                >
                  <img 
                    src={sticker.url}
                    alt={sticker.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {sticker.animated ? (
                    <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                      Live
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
