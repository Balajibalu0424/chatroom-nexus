export interface StickerAsset {
  id: string
  name: string
  url: string
  animated?: boolean
}

export interface StickerPack {
  id: string
  name: string
  stickers: StickerAsset[]
}

function svgSticker(label: string, emoji: string, from: string, to: string, animated = false): string {
  const animation = animated
    ? `<animateTransform attributeName="transform" type="rotate" values="-4 128 128;4 128 128;-4 128 128" dur="1.8s" repeatCount="indefinite"/>`
    : ''

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#020617" flood-opacity=".24"/>
        </filter>
      </defs>
      <g filter="url(#s)">
        <rect x="20" y="22" width="216" height="212" rx="56" fill="url(#g)"/>
        <circle cx="75" cy="72" r="30" fill="rgba(255,255,255,.22)"/>
        <circle cx="194" cy="190" r="44" fill="rgba(255,255,255,.14)"/>
      </g>
      <g>${animation}
        <text x="128" y="132" text-anchor="middle" dominant-baseline="central" font-size="94">${emoji}</text>
        <text x="128" y="210" text-anchor="middle" font-family="Verdana, sans-serif" font-size="22" font-weight="700" fill="white" opacity=".92">${label}</text>
      </g>
    </svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const stickerPacks: StickerPack[] = [
  {
    id: 'glass-reactions',
    name: 'Glass Reactions',
    stickers: [
      { id: 'glass-love', name: 'Love this', url: svgSticker('LOVE', '❤️', '#fb7185', '#f97316', true), animated: true },
      { id: 'glass-laugh', name: 'Laughing', url: svgSticker('LOL', '😂', '#facc15', '#fb923c', true), animated: true },
      { id: 'glass-wow', name: 'Wow', url: svgSticker('WOW', '🤯', '#38bdf8', '#6366f1', true), animated: true },
      { id: 'glass-fire', name: 'Fire', url: svgSticker('FIRE', '🔥', '#ef4444', '#7c2d12', true), animated: true },
      { id: 'glass-yes', name: 'Approved', url: svgSticker('YES', '✅', '#22c55e', '#14b8a6') },
      { id: 'glass-thinking', name: 'Thinking', url: svgSticker('THINK', '🤔', '#a78bfa', '#2563eb') },
    ],
  },
  {
    id: 'soft-signals',
    name: 'Soft Signals',
    stickers: [
      { id: 'soft-coffee', name: 'Coffee break', url: svgSticker('COFFEE', '☕', '#92400e', '#f59e0b') },
      { id: 'soft-focus', name: 'Focus mode', url: svgSticker('FOCUS', '🎧', '#0f766e', '#06b6d4') },
      { id: 'soft-done', name: 'Done', url: svgSticker('DONE', '🏁', '#334155', '#0f172a') },
      { id: 'soft-party', name: 'Celebrate', url: svgSticker('PARTY', '🎉', '#db2777', '#8b5cf6', true), animated: true },
      { id: 'soft-ok', name: 'Okay', url: svgSticker('OK', '👌', '#16a34a', '#65a30d') },
      { id: 'soft-later', name: 'Later', url: svgSticker('LATER', '⏳', '#64748b', '#334155') },
    ],
  },
]
