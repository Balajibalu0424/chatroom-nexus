"use client"

import { Bell, BellOff, CheckCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

export interface InAppNotification {
  id: string
  roomId: string
  roomName: string
  title: string
  body: string
  createdAt: string
  read: boolean
}

interface NotificationCenterProps {
  notifications: InAppNotification[]
  onOpenRoom: (roomId: string) => void
  onMarkAllRead: () => void
  onClear: () => void
}

export function NotificationCenter({
  notifications,
  onOpenRoom,
  onMarkAllRead,
  onClear,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((notification) => !notification.read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Notifications" className="relative">
          {unreadCount > 0 ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-panel w-80 overflow-hidden rounded-2xl border border-white/15 p-0">
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMarkAllRead}>
              <CheckCheck className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-2">
            {notifications.slice(0, 12).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="mb-1 cursor-pointer rounded-xl p-3 focus:bg-white/10"
                onClick={() => onOpenRoom(notification.roomId)}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{notification.title}</span>
                    {!notification.read ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="p-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Push opens the matching room when supported by the browser.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
