"use client"

import { useDeferredValue, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, X } from 'lucide-react'
import { normalizeGifRating, sanitizeGifSearchQuery, type GifRating } from '@/lib/rich-messaging'

interface GifAsset {
  id: string
  title: string
  url: string
  previewUrl: string
  providerUrl?: string
}

interface GifPickerProps {
  rating?: GifRating
  onSelect: (gif: GifAsset) => void
  onClose?: () => void
}

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || ''

function fallbackGif(label: string, from: string, to: string): GifAsset {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="220" rx="34" fill="url(#g)"/>
      <circle cx="82" cy="72" r="38" fill="rgba(255,255,255,.2)">
        <animate attributeName="r" values="30;45;30" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="246" cy="158" r="54" fill="rgba(255,255,255,.14)">
        <animate attributeName="cy" values="148;170;148" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      <text x="160" y="112" text-anchor="middle" font-family="Verdana, sans-serif" font-size="28" font-weight="800" fill="white">${label}</text>
      <text x="160" y="148" text-anchor="middle" font-family="Verdana, sans-serif" font-size="16" fill="rgba(255,255,255,.82)">fallback GIF</text>
    </svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return { id: `fallback-${label}`, title: label, url, previewUrl: url }
}

const fallbackGifs = [
  fallbackGif('Nice move', '#0ea5e9', '#22c55e'),
  fallbackGif('On it', '#6366f1', '#ec4899'),
  fallbackGif('Ship it', '#f97316', '#ef4444'),
  fallbackGif('Focus time', '#14b8a6', '#0f172a'),
]

function mapGiphyResult(item: any): GifAsset | null {
  const animated = item?.images?.fixed_width?.url || item?.images?.downsized_medium?.url
  const still = item?.images?.fixed_width_still?.url || item?.images?.preview_gif?.url || animated
  if (!animated || !still) return null

  return {
    id: String(item.id),
    title: item.title || 'GIF',
    url: animated,
    previewUrl: still,
    providerUrl: item.url,
  }
}

export function GifPicker({ rating = 'g', onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [results, setResults] = useState<GifAsset[]>(fallbackGifs)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const safeRating = normalizeGifRating(rating)

  useEffect(() => {
    const safeQuery = sanitizeGifSearchQuery(deferredQuery)
    if (!GIPHY_API_KEY) {
      setResults(fallbackGifs)
      setError('Add NEXT_PUBLIC_GIPHY_API_KEY for live GIF search.')
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const endpoint = safeQuery ? 'search' : 'trending'
        const url = new URL(`https://api.giphy.com/v1/gifs/${endpoint}`)
        url.searchParams.set('api_key', GIPHY_API_KEY)
        url.searchParams.set('limit', '18')
        url.searchParams.set('rating', safeRating)
        url.searchParams.set('bundle', 'messaging_non_clips')
        if (safeQuery) {
          url.searchParams.set('q', safeQuery)
        }

        const response = await fetch(url.toString(), { signal: controller.signal })
        if (!response.ok) throw new Error('GIF provider request failed')
        const json = await response.json()
        const nextResults = Array.isArray(json.data)
          ? json.data.map(mapGiphyResult).filter(Boolean) as GifAsset[]
          : []
        setResults(nextResults.length ? nextResults : fallbackGifs)
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError('GIF search is unavailable. Showing safe fallback GIFs.')
          setResults(fallbackGifs)
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [deferredQuery, safeRating])

  return (
    <div className="glass-panel w-[22rem] overflow-hidden rounded-2xl border border-white/15">
      <div className="flex items-center justify-between border-b border-white/10 p-3">
        <div>
          <p className="text-sm font-semibold">GIFs</p>
          <p className="text-xs text-muted-foreground">Safe search rating: {safeRating.toUpperCase()}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b border-white/10 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search GIFs..."
            className="h-10 pl-9"
            maxLength={50}
          />
        </div>
      </div>

      {error ? (
        <p className="border-b border-white/10 px-3 py-2 text-xs text-muted-foreground">{error}</p>
      ) : null}

      <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto p-3">
        {isLoading ? (
          <div className="col-span-2 flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching GIFs
          </div>
        ) : (
          results.map((gif) => (
            <button
              key={gif.id}
              type="button"
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted text-left ring-primary/0 transition-all hover:-translate-y-0.5 hover:ring-2 focus-visible:ring-2"
              onClick={() => {
                onSelect(gif)
                onClose?.()
              }}
            >
              <img
                src={gif.previewUrl}
                alt={gif.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                GIF
              </span>
            </button>
          ))
        )}
      </div>

      {GIPHY_API_KEY ? (
        <p className="border-t border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Powered by GIPHY
        </p>
      ) : null}
    </div>
  )
}
