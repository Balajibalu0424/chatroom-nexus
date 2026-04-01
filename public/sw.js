// Service Worker for Push Notifications
// Place this file in: public/sw.js

const CACHE_NAME = 'chatroom-v1'
const OFFLINE_URL = '/'

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline',
      ])
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL)
      })
    )
  }
})

// Push event - show notification
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch (e) {
    data = {
      title: 'New message',
      body: event.data.text(),
    }
  }

  const { title, body, icon, badge, tag, data: notificationData } = data

  const options = {
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: badge || '/badge-72.png',
    tag: tag || 'chatroom-notification',
    data: notificationData || {},
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open Chat',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title || 'Chatroom', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { action } = event
  const { roomId, messageId } = event.notification.data || {}

  if (action === 'dismiss') {
    return
  }

  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if (roomId) {
            client.postMessage({
              type: 'NAVIGATE_TO_ROOM',
              roomId,
              messageId,
            })
          }
          return
        }
      }
      // Open a new window if none exists
      if (self.clients.openWindow) {
        const url = roomId ? `/?room=${roomId}` : '/'
        return self.clients.openWindow(url)
      }
    })
  )
})

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
