export function ChatSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header skeleton */}
      <div className="h-16 border-b px-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-8 h-8 bg-muted rounded animate-pulse" />
        <div className="w-8 h-8 bg-muted rounded animate-pulse" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className={`space-y-2 ${i % 3 === 0 ? 'w-48' : 'w-32'}`}>
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="h-16 border-t p-3 flex items-center gap-2">
        <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
        <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
        <div className="flex-1 h-10 bg-muted rounded-lg animate-pulse" />
        <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
      </div>
    </div>
  )
}

export function RoomListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        <div className="h-20 w-64 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  )
}

export function MembersSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
