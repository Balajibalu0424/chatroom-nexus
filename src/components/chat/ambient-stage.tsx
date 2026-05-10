"use client"

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AmbientStageProps {
  compact?: boolean
  disabled?: boolean
}

export function AmbientStage({ compact = false, disabled = false }: AmbientStageProps) {
  if (disabled) {
    return (
      <div className="rounded-[2rem] border border-border/60 bg-card/70 p-6">
        <p className="text-sm font-medium">Effects are paused</p>
        <p className="mt-1 text-xs text-muted-foreground">Reduced motion or 3D effects are disabled in settings.</p>
      </div>
    )
  }

  return (
    <section className={cn('ambient-stage glass-panel relative overflow-hidden rounded-[2rem] border border-white/15 p-6', compact ? 'min-h-44' : 'min-h-72')}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,.28),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(251,113,133,.2),transparent_24%),radial-gradient(circle_at_60%_80%,rgba(34,197,94,.18),transparent_26%)]" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Live Room Atmosphere
        </div>
        <div className="scene-3d mx-auto h-36 w-56">
          <div className="scene-card scene-card-a">
            <span>GIF</span>
            <strong>Safe media</strong>
          </div>
          <div className="scene-card scene-card-b">
            <span>Push</span>
            <strong>Private alerts</strong>
          </div>
          <div className="scene-card scene-card-c">
            <span>3D</span>
            <strong>Glass chat</strong>
          </div>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Rich messages, private notifications, and depth effects stay lightweight and respect reduced-motion settings.
        </p>
      </div>
    </section>
  )
}
